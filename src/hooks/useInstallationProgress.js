import { useState, useCallback } from 'react';

const STORAGE_KEY = 'medapply_installation';

const DEFAULT_STATE = {
  diagnostic: {
    completed: false,
    currentPhase: 1,
    dossierNumber: null,

    identity: {
      firstName: '', lastName: '', email: '',
      phoneCode: '+33', phoneNumber: '',
      nationality: '', residenceCountry: '',
      languages: [],
    },
    career: {
      diplomaCountry: '', university: '', diplomaYear: '',
      specialistStatus: '',
      specialistTitle: '', specialistCountry: '', specialistYear: '',
      specialistExpectedYear: '',
      clinicalExperienceYears: '',
      currentJobTitle: '', currentEstablishment: '', currentCountry: '',
      targetCantons: [],
      desiredArrivalDate: '',
    },
    documents: {},
    service: {
      selectedPlan: '',
      includeMebekoTaxes: false,
    },

    // Legacy compat
    data: null,
    result: null,
  },
  mebeko: {
    documents: {},
    timeline: {
      preparation: { done: false, date: '', notes: '' },
      sent: { done: false, date: '', notes: '' },
      processing: { done: false, date: '', notes: '' },
      complement: { done: false, date: '', notes: '' },
      decision: { done: false, date: '', notes: '', result: null },
    },
  },
  langue: {
    testPassed: false,
    testDate: '',
    testResult: '',
    certificateUploaded: false,
  },
  permis: {
    jobObtained: false,
    permitRequested: false,
    permitRequestDate: '',
    permitObtained: false,
    permitDate: '',
    permitType: '',
  },
  logement: {
    housingFound: false,
    leaseSigned: false,
    addressRegistered: false,
  },
  pratique: {
    healthInsurance: false,
    bankAccount: false,
    phoneSubscription: false,
    halfFare: false,
  },
};

function migrateDiagnostic(diag) {
  // If old format (has data but no identity), migrate
  if (diag?.data && !diag?.identity?.firstName) {
    const old = diag.data;
    return {
      ...DEFAULT_STATE.diagnostic,
      completed: diag.completed || false,
      currentPhase: diag.completed ? 'summary' : 1,
      identity: {
        ...DEFAULT_STATE.diagnostic.identity,
        nationality: old.nationality || '',
      },
      career: {
        ...DEFAULT_STATE.diagnostic.career,
        diplomaCountry: old.diplomaCountry || '',
        diplomaYear: old.diplomaYear || '',
        specialistStatus: old.hasSpecialistTitle === true ? 'yes' : old.hasSpecialistTitle === false ? 'no' : '',
        specialistTitle: old.specialty || '',
        specialistCountry: old.specialistCountry || '',
      },
      documents: diag.documents || {},
      service: diag.service || DEFAULT_STATE.diagnostic.service,
      // Keep legacy for MebekoPage compat
      data: old,
      result: diag.result || null,
    };
  }
  return diag;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);

    const diagRaw = { ...DEFAULT_STATE.diagnostic, ...parsed.diagnostic };
    const diagMigrated = migrateDiagnostic(diagRaw);

    return {
      ...DEFAULT_STATE,
      ...parsed,
      diagnostic: {
        ...DEFAULT_STATE.diagnostic,
        ...diagMigrated,
        identity: { ...DEFAULT_STATE.diagnostic.identity, ...diagMigrated.identity },
        career: { ...DEFAULT_STATE.diagnostic.career, ...diagMigrated.career },
        documents: { ...DEFAULT_STATE.diagnostic.documents, ...diagMigrated.documents },
        service: { ...DEFAULT_STATE.diagnostic.service, ...diagMigrated.service },
      },
      mebeko: { ...DEFAULT_STATE.mebeko, ...parsed.mebeko, timeline: { ...DEFAULT_STATE.mebeko.timeline, ...parsed.mebeko?.timeline } },
      langue: { ...DEFAULT_STATE.langue, ...parsed.langue },
      permis: { ...DEFAULT_STATE.permis, ...parsed.permis },
      logement: { ...DEFAULT_STATE.logement, ...parsed.logement },
      pratique: { ...DEFAULT_STATE.pratique, ...parsed.pratique },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isEU(nationality) {
  const euCountries = [
    'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
    'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
    'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
    'Portugal', 'République tchèque', 'Roumanie', 'Slovaquie', 'Slovénie', 'Suède',
    'Islande', 'Liechtenstein', 'Norvège',
  ];
  return euCountries.includes(nationality);
}

function computeStepStatus(state) {
  const diag = state.diagnostic;

  const mebekoDocCount = Object.values(state.mebeko.documents).filter(d => d.status === 'uploaded' || d.status === 'validated').length;
  const mebekoTimelineProgress = Object.values(state.mebeko.timeline).some(t => t.done);
  const mebekoStarted = mebekoDocCount > 0 || mebekoTimelineProgress;
  const mebekoCompleted = state.mebeko.timeline.decision.done;

  const langueStarted = state.langue.testPassed || state.langue.certificateUploaded;
  const langueCompleted = state.langue.testPassed && state.langue.certificateUploaded;

  const permisStarted = state.permis.jobObtained || state.permis.permitRequested;
  const permisCompleted = state.permis.permitObtained;

  const logementStarted = state.logement.housingFound || state.logement.leaseSigned;
  const logementCompleted = state.logement.housingFound && state.logement.leaseSigned && state.logement.addressRegistered;

  const pratiqueChecks = [state.pratique.healthInsurance, state.pratique.bankAccount, state.pratique.phoneSubscription, state.pratique.halfFare];
  const pratiqueStarted = pratiqueChecks.some(Boolean);
  const pratiqueCompleted = pratiqueChecks.every(Boolean);

  function status(started, completed) {
    if (completed) return 'completed';
    if (started) return 'in_progress';
    return 'todo';
  }

  return {
    diagnostic: diag.completed ? 'completed' : (
      (diag.identity?.firstName || diag.currentPhase > 1) ? 'in_progress' : 'todo'
    ),
    mebeko: status(mebekoStarted, mebekoCompleted),
    langue: status(langueStarted, langueCompleted),
    permis: status(permisStarted, permisCompleted),
    logement: status(logementStarted, logementCompleted),
    pratique: status(pratiqueStarted, pratiqueCompleted),
  };
}

function computeProgress(statuses) {
  const values = Object.values(statuses);
  const completed = values.filter(s => s === 'completed').length;
  const inProgress = values.filter(s => s === 'in_progress').length;
  return Math.round(((completed + inProgress * 0.3) / values.length) * 100);
}

export default function useInstallationProgress() {
  const [state, setState] = useState(loadState);

  const update = useCallback((stepKey, updates) => {
    setState(prev => {
      const next = {
        ...prev,
        [stepKey]: typeof updates === 'function' ? updates(prev[stepKey]) : { ...prev[stepKey], ...updates },
      };
      saveState(next);
      return next;
    });
  }, []);

  const stepStatuses = computeStepStatus(state);
  const progress = computeProgress(stepStatuses);

  // Support both new and old state shapes
  const nat = state.diagnostic.identity?.nationality || state.diagnostic.data?.nationality || '';
  const isEUPath = isEU(nat);

  return {
    state,
    update,
    stepStatuses,
    progress,
    isEUPath,
  };
}
