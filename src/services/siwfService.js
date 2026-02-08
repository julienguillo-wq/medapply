/**
 * Service pour charger et filtrer les données SIWF
 */

import { findDomain } from '../data/hospitalDomains';

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
 * Normalize a name part: lowercase, strip accents and non-alpha chars
 */
function normalizeName(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.-]/g, '');
}

/**
 * Clean director title, extract first + last name
 */
function parseDirectorName(director) {
  if (!director) return null;

  const name = director
    .replace(/\b(Herr|Frau|Prof\.|Dr\.|med\.|PD|PhD|MPH|MSc|BSc|MBA|dipl\.)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  return {
    firstName: normalizeName(parts[0]),
    lastName: normalizeName(parts[parts.length - 1]),
  };
}

/**
 * Generate a suggested email from establishment name + director name.
 * 1. Look up the domain in hospitalDomains.js (partial match on establishment name)
 * 2. If found, generate firstname.lastname@domain
 * 3. Otherwise return null (displayed as "Domaine inconnu")
 */
export function generateEmail(director, homepage, establishmentName) {
  const parsed = parseDirectorName(director);
  if (!parsed) return null;

  // 1. Try domain lookup from hospital mapping
  const mappedDomain = findDomain(establishmentName);
  if (mappedDomain) {
    return `${parsed.firstName}.${parsed.lastName}@${mappedDomain}`;
  }

  // 2. Fallback: try extracting domain from homepage (if available)
  if (homepage) {
    try {
      const url = new URL(homepage);
      const domain = url.hostname.replace(/^www\./, '');
      return `${parsed.firstName}.${parsed.lastName}@${domain}`;
    } catch {
      // invalid URL, fall through
    }
  }

  // 3. No domain found
  return null;
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
/**
 * Clean director name: remove Herr/Frau prefix
 */
export function cleanDirector(name) {
  if (!name) return '—';
  return name.replace(/^(Herr|Frau)\s+/i, '');
}

export function getEmail(establishment) {
  const manual = getManualEmails()[String(establishment.id)];
  if (manual) return { email: manual, source: 'manual' };

  const pattern = generateEmail(establishment.director, establishment.homepage, establishment.name);
  if (pattern) return { email: pattern, source: 'pattern' };

  return { email: null, source: null };
}
