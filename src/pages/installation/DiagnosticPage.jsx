import { useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import PhaseProgress from './diagnostic/PhaseProgress';
import PhaseIdentite from './diagnostic/PhaseIdentite';
import PhaseParcours from './diagnostic/PhaseParcours';
import PhaseDocuments from './diagnostic/PhaseDocuments';
import PhaseService from './diagnostic/PhaseService';
import SummaryScreen from './diagnostic/SummaryScreen';
import { validatePhase1, validatePhase2, validatePhase3, validatePhase4 } from './diagnostic/validation';

export default function DiagnosticPage() {
  const { state, update } = useOutletContext();
  const navigate = useNavigate();
  const diag = state.diagnostic;

  const [phase, setPhase] = useState(() => diag.completed ? 'summary' : (diag.currentPhase || 1));
  const [formData, setFormData] = useState(() => ({
    identity: { ...diag.identity },
    career: { ...diag.career },
    documents: { ...diag.documents },
    service: { ...diag.service },
  }));
  const [errors, setErrors] = useState({});
  const [editingFrom, setEditingFrom] = useState(null);

  const persist = useCallback((data, phaseNum) => {
    update('diagnostic', {
      ...diag,
      ...data,
      currentPhase: phaseNum,
    });
  }, [diag, update]);

  const onNext = useCallback((phaseKey, data) => {
    // Validate
    let validation;
    if (phaseKey === 'identity') validation = validatePhase1(data);
    else if (phaseKey === 'career') validation = validatePhase2(data);
    else if (phaseKey === 'documents') validation = validatePhase3(data);
    else if (phaseKey === 'service') validation = validatePhase4(data);

    if (validation && !validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const newFormData = { ...formData, [phaseKey]: data };
    setFormData(newFormData);

    // If editing from summary, go back to summary
    if (editingFrom === 'summary') {
      setEditingFrom(null);
      setPhase('summary');
      persist(newFormData, 'summary');
      return;
    }

    // Advance phase
    const phaseMap = { identity: 1, career: 2, documents: 3, service: 4 };
    const currentNum = phaseMap[phaseKey];
    const nextPhase = currentNum < 4 ? currentNum + 1 : 'summary';
    setPhase(nextPhase);
    persist(newFormData, nextPhase);
  }, [formData, editingFrom, persist]);

  const onBack = useCallback(() => {
    setErrors({});
    if (editingFrom === 'summary') {
      setEditingFrom(null);
      setPhase('summary');
      return;
    }
    if (typeof phase === 'number' && phase > 1) {
      setPhase(phase - 1);
    }
  }, [phase, editingFrom]);

  const onEditPhase = useCallback((n) => {
    setErrors({});
    setEditingFrom('summary');
    setPhase(n);
  }, []);

  const onSubmit = useCallback((dossierNumber) => {
    update('diagnostic', {
      ...formData,
      completed: true,
      currentPhase: 'summary',
      dossierNumber,
      // Keep legacy compat for MebekoPage
      data: {
        nationality: formData.identity.nationality,
        diplomaCountry: formData.career.diplomaCountry,
        diplomaYear: formData.career.diplomaYear,
        specialty: formData.career.specialistTitle,
        hasSpecialistTitle: formData.career.specialistStatus === 'yes',
      },
      result: null,
    });
  }, [formData, update]);

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Votre dossier DocStart</h1>
        <p className="text-gray-500 text-[15px]">Complétez les 4 étapes pour constituer votre dossier d'installation en Suisse</p>
      </div>

      {phase !== 'summary' && <PhaseProgress phase={phase} />}

      <div key={phase} className="animate-slide">
        {phase === 1 && (
          <PhaseIdentite
            data={formData.identity}
            errors={errors}
            onChange={d => setFormData(prev => ({ ...prev, identity: d }))}
            onNext={() => onNext('identity', formData.identity)}
            onBack={editingFrom === 'summary' ? onBack : null}
          />
        )}
        {phase === 2 && (
          <PhaseParcours
            data={formData.career}
            errors={errors}
            onChange={d => setFormData(prev => ({ ...prev, career: d }))}
            onNext={() => onNext('career', formData.career)}
            onBack={onBack}
          />
        )}
        {phase === 3 && (
          <PhaseDocuments
            data={formData.documents}
            errors={errors}
            onChange={d => setFormData(prev => ({ ...prev, documents: d }))}
            onNext={() => onNext('documents', formData.documents)}
            onBack={onBack}
          />
        )}
        {phase === 4 && (
          <PhaseService
            data={formData.service}
            errors={errors}
            onChange={d => setFormData(prev => ({ ...prev, service: d }))}
            onNext={() => onNext('service', formData.service)}
            onBack={onBack}
          />
        )}
        {phase === 'summary' && (
          <SummaryScreen
            formData={formData}
            onEditPhase={onEditPhase}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}
