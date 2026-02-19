export function validatePhase1(data) {
  const errors = {};
  if (!data.firstName?.trim()) errors.firstName = 'Prénom requis';
  if (!data.lastName?.trim()) errors.lastName = 'Nom requis';
  if (!data.email?.trim()) errors.email = 'Email requis';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Email invalide';
  if (!data.phoneNumber?.trim()) errors.phoneNumber = 'Numéro de téléphone requis';
  if (!data.nationality) errors.nationality = 'Nationalité requise';
  if (!data.residenceCountry) errors.residenceCountry = 'Pays de résidence requis';
  if (!data.languages || data.languages.length === 0) errors.languages = 'Sélectionnez au moins une langue';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePhase2(data) {
  const errors = {};
  if (!data.diplomaCountry) errors.diplomaCountry = 'Pays du diplôme requis';
  if (!data.university?.trim()) errors.university = 'Université requise';
  if (!data.diplomaYear) errors.diplomaYear = 'Année du diplôme requise';
  if (!data.specialistStatus) errors.specialistStatus = 'Sélectionnez votre statut de spécialiste';

  if (data.specialistStatus === 'yes') {
    if (!data.specialistTitle) errors.specialistTitle = 'Titre de spécialiste requis';
    if (!data.specialistCountry) errors.specialistCountry = 'Pays du titre requis';
    if (!data.specialistYear) errors.specialistYear = 'Année d\'obtention requise';
  }
  if (data.specialistStatus === 'in_progress') {
    if (!data.specialistTitle) errors.specialistTitle = 'Spécialité visée requise';
    if (!data.specialistExpectedYear) errors.specialistExpectedYear = 'Année prévue requise';
  }

  if (!data.clinicalExperienceYears) errors.clinicalExperienceYears = 'Expérience clinique requise';
  if (!data.targetCantons || data.targetCantons.length === 0) errors.targetCantons = 'Sélectionnez au moins un canton';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePhase3(documents) {
  const errors = {};
  const docIds = ['diplome', 'traduction_diplome', 'titre_specialiste', 'good_standing',
    'conformite_eu', 'identite', 'photo', 'cv_medical', 'casier_judiciaire', 'formulaire_mebeko'];
  const answered = docIds.filter(id => documents[id]);
  if (answered.length < 5) {
    errors._global = 'Veuillez indiquer le statut d\'au moins 5 documents';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validatePhase4(data) {
  const errors = {};
  if (!data.selectedPlan) errors.selectedPlan = 'Veuillez choisir un forfait';
  return { valid: Object.keys(errors).length === 0, errors };
}
