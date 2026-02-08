/**
 * Service pour charger et filtrer les données SIWF
 */

// Canton name mapping
const CANTON_NAMES = {
  'ZH': 'Zurich', 'BE': 'Berne', 'VD': 'Vaud', 'GE': 'Genève',
  'VS': 'Valais', 'NE': 'Neuchâtel', 'FR': 'Fribourg', 'JU': 'Jura',
  'BS': 'Bâle-Ville', 'BL': 'Bâle-Campagne', 'SO': 'Soleure',
  'AG': 'Argovie', 'LU': 'Lucerne', 'ZG': 'Zoug', 'SZ': 'Schwytz',
  'NW': 'Nidwald', 'OW': 'Obwald', 'UR': 'Uri', 'GL': 'Glaris',
  'SH': 'Schaffhouse', 'AR': 'Appenzell RE', 'AI': 'Appenzell RI',
  'SG': 'Saint-Gall', 'GR': 'Grisons', 'TG': 'Thurgovie', 'TI': 'Tessin',
};

const EMAILS_STORAGE_KEY = 'medapply_emails';

// Singleton caches
let _establishments = null;
let _specialties = null;

export async function loadEstablishments() {
  if (_establishments) return _establishments;
  const res = await fetch('/data/establishments.json');
  if (!res.ok) throw new Error('Impossible de charger les établissements');
  _establishments = await res.json();
  return _establishments;
}

export async function loadSpecialties() {
  if (_specialties) return _specialties;
  const res = await fetch('/data/specialties.json');
  if (!res.ok) throw new Error('Impossible de charger les spécialités');
  _specialties = await res.json();
  return _specialties;
}

export function filterEstablishments(all, { cantons = [], specialties = [], query = '' } = {}) {
  let filtered = all;

  if (cantons.length > 0) {
    filtered = filtered.filter(e => cantons.includes(e.canton));
  }

  if (specialties.length > 0) {
    filtered = filtered.filter(e => specialties.includes(e.specialty));
  }

  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter(e =>
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.director && e.director.toLowerCase().includes(q)) ||
      (e.specialty && e.specialty.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export function computeCantonCounts(all, selectedSpecialties = []) {
  const counts = {};

  // Initialize all cantons
  for (const [code, name] of Object.entries(CANTON_NAMES)) {
    counts[code] = { name, count: 0 };
  }

  // Count establishments per canton
  const subset = selectedSpecialties.length > 0
    ? all.filter(e => selectedSpecialties.includes(e.specialty))
    : all;

  for (const e of subset) {
    if (e.canton && counts[e.canton]) {
      counts[e.canton].count++;
    }
  }

  return counts;
}

/**
 * Generate a suggested email from director name + homepage URL
 */
export function generateEmail(director, homepage) {
  if (!director || !homepage) return null;

  // Clean director title
  let name = director
    .replace(/\b(Herr|Frau|Prof\.|Dr\.|med\.|PD|PhD|MPH|MSc|BSc|MBA|dipl\.)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) return null;

  // Extract domain from homepage
  let domain;
  try {
    const url = new URL(homepage);
    domain = url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  // Split name into parts, take first and last
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];

  // Normalize accents
  const normalize = (s) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.-]/g, '');

  return `${normalize(firstName)}.${normalize(lastName)}@${domain}`;
}

/**
 * Get manual email overrides from localStorage
 */
export function getManualEmails() {
  try {
    return JSON.parse(localStorage.getItem(EMAILS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Save a manual email for an establishment
 */
export function saveManualEmail(establishmentId, email) {
  const emails = getManualEmails();
  if (email) {
    emails[String(establishmentId)] = email;
  } else {
    delete emails[String(establishmentId)];
  }
  localStorage.setItem(EMAILS_STORAGE_KEY, JSON.stringify(emails));
}

/**
 * Get the best email for an establishment (manual > pattern > null)
 */
export function getEmail(establishment) {
  const manual = getManualEmails()[String(establishment.id)];
  if (manual) return { email: manual, source: 'manual' };

  const pattern = generateEmail(establishment.director, establishment.homepage);
  if (pattern) return { email: pattern, source: 'pattern' };

  return { email: null, source: null };
}
