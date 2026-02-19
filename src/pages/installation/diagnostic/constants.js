export const NATIONALITIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'République tchèque', 'Roumanie', 'Slovaquie', 'Slovénie', 'Suède',
  'Islande', 'Liechtenstein', 'Norvège',
  '---',
  'Afghanistan', 'Algérie', 'Argentine', 'Australie', 'Brésil', 'Cameroun', 'Canada',
  'Chine', 'Colombie', 'Égypte', 'États-Unis', 'Inde', 'Irak', 'Iran', 'Israël',
  'Japon', 'Liban', 'Libye', 'Maroc', 'Mexique', 'Nigeria', 'Pakistan', 'Pérou',
  'Russie', 'Sénégal', 'Syrie', 'Tunisie', 'Turquie', 'Ukraine', 'Vietnam',
  'Autre',
];

export const EU_COUNTRIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie', 'Danemark',
  'Espagne', 'Estonie', 'Finlande', 'France', 'Grèce', 'Hongrie', 'Irlande',
  'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte', 'Pays-Bas', 'Pologne',
  'Portugal', 'République tchèque', 'Roumanie', 'Slovaquie', 'Slovénie', 'Suède',
  'Islande', 'Liechtenstein', 'Norvège',
];

export const SPECIALTIES = [
  'Allergologie et immunologie clinique', 'Anesthésiologie', 'Angiologie',
  'Cardiologie', 'Chirurgie', 'Chirurgie cardiaque et vasculaire thoracique',
  'Chirurgie orale et maxillo-faciale', 'Chirurgie orthopédique et traumatologie',
  'Chirurgie pédiatrique', 'Chirurgie plastique, reconstructive et esthétique',
  'Dermatologie et vénéréologie', 'Endocrinologie-diabétologie',
  'Gastroentérologie', 'Génétique médicale', 'Gériatrie', 'Gynécologie et obstétrique',
  'Hématologie', 'Infectiologie', 'Médecine du travail', 'Médecine générale',
  'Médecine intensive', 'Médecine interne générale', 'Médecine légale',
  'Médecine nucléaire', 'Médecine pharmaceutique', 'Médecine physique et réadaptation',
  'Médecine tropicale et médecine des voyages', 'Néphrologie', 'Neurochirurgie',
  'Neurologie', 'Neuropathologie', 'Oncologie médicale',
  'Ophtalmologie', 'Oto-rhino-laryngologie', 'Pathologie',
  'Pédiatrie', 'Pharmacologie et toxicologie cliniques', 'Pneumologie',
  'Psychiatrie et psychothérapie', 'Psychiatrie et psychothérapie d\'enfants et d\'adolescents',
  'Radiologie', 'Radio-oncologie / radiothérapie', 'Rhumatologie',
  'Urologie',
  'Pas encore de spécialité',
];

export const PHONE_CODES = [
  { code: '+33', country: 'France' },
  { code: '+49', country: 'Allemagne' },
  { code: '+39', country: 'Italie' },
  { code: '+34', country: 'Espagne' },
  { code: '+351', country: 'Portugal' },
  { code: '+32', country: 'Belgique' },
  { code: '+41', country: 'Suisse' },
  { code: '+43', country: 'Autriche' },
  { code: '+44', country: 'Royaume-Uni' },
  { code: '+212', country: 'Maroc' },
  { code: '+216', country: 'Tunisie' },
  { code: '+213', country: 'Algérie' },
  { code: '+961', country: 'Liban' },
  { code: '+40', country: 'Roumanie' },
  { code: '+48', country: 'Pologne' },
];

export const LANGUAGES = [
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Allemand' },
  { id: 'it', label: 'Italien' },
  { id: 'en', label: 'Anglais' },
  { id: 'es', label: 'Espagnol' },
  { id: 'pt', label: 'Portugais' },
  { id: 'ar', label: 'Arabe' },
  { id: 'autre', label: 'Autre' },
];

export const CANTONS = {
  'ZH': 'Zurich', 'BE': 'Berne', 'VD': 'Vaud', 'GE': 'Genève',
  'VS': 'Valais', 'NE': 'Neuchâtel', 'FR': 'Fribourg', 'JU': 'Jura',
  'BS': 'Bâle-Ville', 'BL': 'Bâle-Campagne', 'SO': 'Soleure', 'AG': 'Argovie',
  'LU': 'Lucerne', 'ZG': 'Zoug', 'SZ': 'Schwytz', 'NW': 'Nidwald',
  'OW': 'Obwald', 'UR': 'Uri', 'GL': 'Glaris', 'SH': 'Schaffhouse',
  'AR': 'Appenzell RE', 'AI': 'Appenzell RI', 'SG': 'Saint-Gall',
  'GR': 'Grisons', 'TG': 'Thurgovie', 'TI': 'Tessin',
};

export const ONBOARDING_DOCUMENTS = [
  { id: 'diplome', name: 'Diplôme de médecine (copie certifiée conforme)' },
  { id: 'traduction_diplome', name: 'Traduction certifiée du diplôme' },
  { id: 'titre_specialiste', name: 'Titre de spécialiste (copie certifiée conforme)', note: 'Si applicable' },
  { id: 'good_standing', name: 'Certificate of Good Standing' },
  { id: 'conformite_eu', name: 'Attestation de conformité EU', note: 'Voie UE/AELE uniquement' },
  { id: 'identite', name: 'Pièce d\'identité / passeport' },
  { id: 'photo', name: 'Photo d\'identité' },
  { id: 'cv_medical', name: 'CV médical détaillé' },
  { id: 'casier_judiciaire', name: 'Extrait de casier judiciaire', note: 'Moins de 3 mois' },
  { id: 'formulaire_mebeko', name: 'Formulaire de demande MEBEKO' },
];

export const SERVICE_PLANS = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    price: '490',
    currency: 'CHF',
    description: 'Pour les médecins autonomes qui veulent un accompagnement ciblé',
    features: [
      { label: 'Diagnostic d\'éligibilité personnalisé', included: true },
      { label: 'Check-list documents personnalisée', included: true },
      { label: 'Guide procédure MEBEKO pas à pas', included: true },
      { label: 'Support email (48h)', included: true },
      { label: 'Vérification du dossier avant envoi', included: false },
      { label: 'Obtention des documents à votre place', included: false },
      { label: 'Suivi du dossier MEBEKO', included: false },
      { label: 'Accompagnement recherche d\'emploi', included: false },
    ],
  },
  {
    id: 'confort',
    name: 'Confort',
    price: '1\'490',
    currency: 'CHF',
    badge: 'POPULAIRE',
    description: 'L\'accompagnement complet pour réussir votre installation sereinement',
    features: [
      { label: 'Diagnostic d\'éligibilité personnalisé', included: true },
      { label: 'Check-list documents personnalisée', included: true },
      { label: 'Guide procédure MEBEKO pas à pas', included: true },
      { label: 'Support prioritaire (24h)', included: true },
      { label: 'Vérification du dossier avant envoi', included: true },
      { label: 'Obtention des documents à votre place', included: true },
      { label: 'Suivi du dossier MEBEKO', included: false },
      { label: 'Accompagnement recherche d\'emploi', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '2\'990',
    currency: 'CHF',
    badge: 'TOUT COMPRIS',
    description: 'Délégation totale — on s\'occupe de tout, vous vous concentrez sur la médecine',
    features: [
      { label: 'Diagnostic d\'éligibilité personnalisé', included: true },
      { label: 'Check-list documents personnalisée', included: true },
      { label: 'Guide procédure MEBEKO pas à pas', included: true },
      { label: 'Support VIP dédié (WhatsApp)', included: true },
      { label: 'Vérification du dossier avant envoi', included: true },
      { label: 'Obtention des documents à votre place', included: true },
      { label: 'Suivi du dossier MEBEKO', included: true },
      { label: 'Accompagnement recherche d\'emploi', included: true },
    ],
  },
];

export const MEBEKO_TAXES = {
  label: 'Inclure les taxes MEBEKO (~800 CHF voie UE / ~1500 CHF hors-UE)',
  description: 'DocStart avance les frais MEBEKO pour vous. Remboursement inclus dans le forfait.',
};

export const PHASE_NAMES = [
  'Identité et coordonnées',
  'Parcours médical',
  'Documents disponibles',
  'Niveau de service',
];
