/**
 * Service de calcul du score de compatibilité
 * Score 0-100 basé sur : spécialité, canton, catégorie/expérience
 */

// Groupes de spécialités apparentées (partial match = +20)
const RELATED_GROUPS = [
  // Médecine interne et sous-spécialités
  [
    'Médecine interne générale', 'Gériatrie', 'Rhumatologie',
    'Endocrinologie/diabétologie', 'Gastroentérologie', 'Néphrologie',
    'Pneumologie', 'Cardiologie', 'Hématologie', 'Oncologie médicale',
    'Infectiologie', 'Allergologie et immunologie clinique', 'Angiologie',
    'Médecine physique et réadaptation', 'Médecine intensive',
    'Pharmacologie et toxicologie cliniques', 'Hépatologie',
  ],
  // Chirurgie et sous-spécialités
  [
    'Chirurgie', 'Chirurgie orthopédique et traumatologie de l\'appareil locomoteur',
    'Chirurgie pédiatrique', 'Chirurgie de la main',
    'Chirurgie cardiaque et vasculaire thoracique', 'Chirurgie orale et maxillo-faciale',
    'Neurochirurgie', 'Chirurgie plastique, reconstructive et esthétique',
    'Chirurgie thoracique', 'Chirurgie vasculaire', 'Chirurgie cervico-faciale',
    'Sénologie chirurgicale',
  ],
  // Pédiatrie et sous-spécialités
  [
    'Pédiatrie', 'Pneumologie pédiatrique', 'Neuropédiatrie',
    'Cardiologie pédiatrique',
    'Gastroentérologie, hépatologie et nutrition pédiatriques',
    'Endocrinologie-diabétologie pédiatrique', 'Néphrologie pédiatrique',
    'Onco-hématologie pédiatrique', 'Rhumatologie pédiatrique',
    'Néonatologie', 'Pédiatrie du développement', 'Médecine d\'urgence pédiatrique',
  ],
  // Psychiatrie
  [
    'Psychiatrie et psychothérapie',
    'Psychiatrie et psychothérapie d\'enfants et d\'adolescents',
    'Psychiatrie de consultation et de liaison',
    'Psychiatrie et psychothérapie de la personne âgée',
    'Psychiatrie et psychothérapie des addictions',
    'Psychiatrie et psychothérapie forensique',
    'Psychiatrie et psychothérapie forensique pour enfants et adolescents',
  ],
  // Radiologie
  [
    'Radiologie', 'Radiologie pédiatrique', 'Neuroradiologie diagnostique',
    'Neuroradiologie invasive', 'Radio-oncologie / radiothérapie',
    'Médecine nucléaire',
  ],
  // Gynécologie
  [
    'Gynécologie et obstétrique', 'Gynécologie-obstétrique opératoire',
    'Médecine de la reproduction et endocrinologie gynécologique',
    'Médecine foeto-maternelle', 'Oncologie gynécologique',
    'Sénologie gynécologique', 'Urogynécologie',
  ],
  // Urologie
  [
    'Urologie', 'Uro-oncologie', 'Neuro-urologie',
    'Endo-urologie complexe', 'Urologie de la femme', 'Urologie reconstructive',
  ],
  // Pathologie
  [
    'Pathologie', 'Cytopathologie', 'Pathologie moléculaire', 'Dermatopathologie',
  ],
  // Dermatologie
  ['Dermatologie et vénéréologie', 'Dermatopathologie'],
  // ORL / Phoniatrie
  ['Oto-rhino-laryngologie', 'Phoniatrie'],
  // Ophtalmologie
  ['Ophtalmologie', 'Ophtalmochirurgie'],
];

// Build a lookup: specialty → set of related specialties
const _relatedCache = new Map();
function getRelatedSpecialties(specialty) {
  if (_relatedCache.has(specialty)) return _relatedCache.get(specialty);
  const related = new Set();
  for (const group of RELATED_GROUPS) {
    if (group.includes(specialty)) {
      for (const s of group) {
        if (s !== specialty) related.add(s);
      }
    }
  }
  _relatedCache.set(specialty, related);
  return related;
}

/**
 * Parse category letter from establishment category string.
 * E.g. "Catégorie B (2 ans)" → "B"
 */
function parseCategory(category) {
  if (!category) return null;
  const match = category.match(/Cat[ée]gorie\s+([A-C])/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Compute total completed months from parcours stages.
 */
function computeExperienceMonths(stages) {
  if (!stages || stages.length === 0) return 0;
  let months = 0;
  for (const s of stages) {
    if (s.status === 'completed' || s.status === 'in_progress') {
      const m = parseInt(s.duration) || 0;
      months += m;
    }
  }
  return months;
}

/**
 * Calculate compatibility score (0-100) for an establishment.
 *
 * @param {Object} establishment - { specialty, canton, category, ... }
 * @param {Object} profile - { specialty, preferred_cantons: string[] }
 * @param {Array} stages - parcours stages [{ duration, status, ... }]
 * @returns {number} Score 0-100
 */
export function calculateScore(establishment, profile, stages = []) {
  if (!profile) return null;

  let score = 0;

  // 1. Specialty match (+40 exact, +20 related)
  if (profile.specialty && establishment.specialty) {
    const profileSpec = profile.specialty.trim();
    const estSpec = establishment.specialty.trim();

    if (profileSpec.toLowerCase() === estSpec.toLowerCase()) {
      score += 40;
    } else if (getRelatedSpecialties(profileSpec).has(estSpec)) {
      score += 20;
    }
  }

  // 2. Canton in preferences (+30)
  const cantons = profile.preferred_cantons || [];
  if (cantons.length > 0 && establishment.canton) {
    if (cantons.includes(establishment.canton)) {
      score += 30;
    }
  }

  // 3. Category vs experience level (+30)
  const cat = parseCategory(establishment.category);
  if (cat) {
    const months = computeExperienceMonths(stages);
    const years = months / 12;

    if (years < 2) {
      // Junior → C or B preferred
      if (cat === 'C') score += 30;
      else if (cat === 'B') score += 20;
      else if (cat === 'A') score += 5;
    } else if (years < 4) {
      // Mid → B or A preferred
      if (cat === 'B') score += 30;
      else if (cat === 'A') score += 20;
      else if (cat === 'C') score += 10;
    } else {
      // Senior → A preferred
      if (cat === 'A') score += 30;
      else if (cat === 'B') score += 15;
      else if (cat === 'C') score += 5;
    }
  }

  return Math.min(score, 100);
}

/**
 * Get score tier info for display.
 */
export function getScoreTier(score) {
  if (score >= 80) return { label: 'Excellent match', color: 'green' };
  if (score >= 60) return { label: 'Bon match', color: 'blue' };
  if (score >= 40) return { label: 'Match moyen', color: 'orange' };
  return { label: 'Match faible', color: 'gray' };
}
