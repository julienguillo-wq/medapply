/**
 * Script de récupération des données SIWF (register.siwf.ch)
 * Télécharge les établissements de formation postgraduée et les spécialités
 * Génère public/data/establishments.json et public/data/specialties.json
 *
 * Usage: node scripts/fetch-siwf-data.mjs
 *
 * Note: Uses curl to bypass Cloudflare challenge (Node fetch is blocked).
 */

import { writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');

const BASE_URL = 'https://register.siwf.ch/SiwfRegister';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TODAY = new Date().toISOString().split('T')[0];
const PAGE_SIZE = 500;

// DataTable column definitions (must match exactly what the website sends)
const DT_COLUMNS = [
  { data: 'NameWeiterbildungsstaette', orderable: true },
  { data: 'WeiterbildungsstaettenVerbunde', orderable: false },
  { data: 'PLZ', orderable: true },
  { data: 'Ort', orderable: true },
  { data: 'LeiterWeiterbildungsstaette', orderable: true },
  { data: 'Fachgebiet', orderable: true },
  { data: 'WBKategorie', orderable: true },
  { data: 'Id', orderable: false },
];

// PLZ → Canton mapping
const plzCantonMap = [
  [1000, 1099, 'VD'], [1100, 1199, 'VD'], [1200, 1299, 'GE'],
  [1300, 1399, 'VD'], [1400, 1499, 'FR'], [1500, 1599, 'FR'],
  [1600, 1699, 'FR'], [1700, 1799, 'FR'], [1800, 1899, 'VD'],
  [1900, 1999, 'VS'], [2000, 2099, 'NE'], [2100, 2199, 'NE'],
  [2200, 2299, 'NE'], [2300, 2399, 'NE'], [2400, 2499, 'BE'],
  [2500, 2599, 'BE'], [2600, 2699, 'BE'], [2700, 2799, 'BE'],
  [2800, 2899, 'JU'], [2900, 2999, 'JU'],
  [3000, 3199, 'BE'], [3200, 3299, 'BE'], [3300, 3399, 'BE'],
  [3400, 3499, 'BE'], [3500, 3599, 'BE'], [3600, 3699, 'BE'],
  [3700, 3799, 'BE'], [3800, 3899, 'BE'], [3900, 3999, 'VS'],
  [4000, 4099, 'BS'], [4100, 4199, 'BL'], [4200, 4299, 'BL'],
  [4300, 4399, 'SO'], [4400, 4499, 'SO'], [4500, 4599, 'SO'],
  [4600, 4699, 'SO'], [4700, 4799, 'SO'], [4800, 4899, 'AG'],
  [4900, 4999, 'AG'],
  [5000, 5099, 'AG'], [5100, 5199, 'AG'], [5200, 5299, 'AG'],
  [5300, 5399, 'AG'], [5400, 5499, 'AG'], [5500, 5599, 'AG'],
  [5600, 5699, 'AG'], [5700, 5799, 'AG'], [5800, 5899, 'AG'],
  [5900, 5999, 'AG'],
  [6000, 6099, 'LU'], [6100, 6199, 'LU'], [6200, 6299, 'LU'],
  [6300, 6399, 'ZG'], [6400, 6499, 'SZ'], [6500, 6599, 'TI'],
  [6600, 6699, 'TI'], [6700, 6799, 'TI'], [6800, 6899, 'TI'],
  [6900, 6999, 'TI'],
  [7000, 7099, 'GR'], [7100, 7199, 'GR'], [7200, 7299, 'GR'],
  [7300, 7399, 'GR'], [7400, 7499, 'GR'], [7500, 7599, 'GR'],
  [7600, 7699, 'GR'], [7700, 7799, 'GR'],
  [8000, 8099, 'ZH'], [8100, 8199, 'ZH'], [8200, 8299, 'SH'],
  [8300, 8399, 'ZH'], [8400, 8499, 'ZH'], [8500, 8599, 'TG'],
  [8600, 8699, 'ZH'], [8700, 8799, 'ZH'], [8800, 8899, 'ZH'],
  [8900, 8999, 'SG'],
  [9000, 9099, 'SG'], [9100, 9199, 'SG'], [9200, 9299, 'SG'],
  [9300, 9399, 'SG'], [9400, 9499, 'SG'], [9500, 9599, 'SG'],
  [9600, 9699, 'TG'], [9700, 9799, 'TG'], [9800, 9899, 'AI'],
  [9900, 9999, 'AR'],
];

const plzExceptions = {
  '1201': 'GE', '1202': 'GE', '1203': 'GE', '1204': 'GE', '1205': 'GE',
  '1206': 'GE', '1207': 'GE', '1208': 'GE', '1209': 'GE', '1210': 'GE',
  '1211': 'GE', '1212': 'GE', '1213': 'GE', '1214': 'GE', '1215': 'GE',
  '1216': 'GE', '1217': 'GE', '1218': 'GE', '1219': 'GE', '1220': 'GE',
  '1222': 'GE', '1223': 'GE', '1224': 'GE', '1225': 'GE', '1226': 'GE',
  '1227': 'GE', '1228': 'GE', '1231': 'GE', '1232': 'GE', '1233': 'GE',
  '1234': 'GE', '1236': 'GE', '1237': 'GE', '1238': 'GE', '1239': 'GE',
  '1240': 'GE', '1241': 'GE', '1242': 'GE', '1243': 'GE', '1244': 'GE',
  '1245': 'GE', '1246': 'GE', '1247': 'GE', '1248': 'GE', '1249': 'GE',
  '1250': 'GE', '1251': 'GE', '1252': 'GE', '1253': 'GE', '1254': 'GE',
  '1255': 'GE', '1256': 'GE', '1257': 'GE', '1258': 'GE',
  '1260': 'VD', '1261': 'VD', '1262': 'VD', '1263': 'VD', '1264': 'VD',
  '1266': 'VD', '1267': 'VD', '1268': 'VD', '1269': 'VD', '1270': 'VD',
  '1271': 'VD', '1272': 'VD', '1273': 'VD', '1274': 'VD', '1275': 'VD',
  '1276': 'VD', '1277': 'VD', '1278': 'VD', '1279': 'VD', '1280': 'VD',
  '1281': 'VD', '1283': 'VD', '1284': 'VD', '1285': 'VD', '1286': 'VD',
  '1287': 'VD', '1288': 'VD', '1289': 'VD', '1290': 'VD', '1291': 'VD',
  '1292': 'GE', '1293': 'GE', '1294': 'GE', '1295': 'VD', '1296': 'VD',
  '1297': 'VD', '1298': 'VD', '1299': 'VD',
  '2540': 'SO', '2542': 'BE', '2543': 'BE',
  '4710': 'SO', '4712': 'SO', '4715': 'SO',
  '6048': 'OW', '6053': 'OW', '6055': 'OW', '6056': 'NW',
  '6060': 'OW', '6062': 'OW', '6063': 'OW', '6064': 'OW',
  '6065': 'UR', '6066': 'UR', '6067': 'UR', '6068': 'UR',
  '6370': 'NW', '6371': 'NW', '6372': 'NW', '6373': 'NW', '6374': 'NW',
  '6375': 'NW', '6376': 'NW', '6377': 'NW', '6382': 'NW', '6383': 'NW',
  '6386': 'NW', '6387': 'NW', '6388': 'NW', '6390': 'OW',
  '6391': 'OW', '6392': 'NW',
  '6410': 'SZ', '6411': 'SZ', '6412': 'SZ', '6413': 'SZ', '6414': 'SZ',
  '6415': 'SZ', '6416': 'SZ', '6417': 'SZ', '6418': 'SZ',
  '6422': 'SZ', '6423': 'SZ', '6424': 'SZ', '6430': 'SZ', '6431': 'SZ',
  '6432': 'SZ', '6433': 'SZ', '6434': 'SZ', '6436': 'SZ', '6438': 'SZ',
  '6440': 'SZ', '6441': 'SZ', '6442': 'SZ', '6443': 'SZ',
  '6452': 'UR', '6454': 'UR', '6460': 'UR', '6461': 'UR', '6462': 'UR',
  '6463': 'UR', '6464': 'UR', '6465': 'UR', '6466': 'UR', '6467': 'UR',
  '6468': 'UR', '6469': 'UR', '6472': 'UR', '6473': 'UR', '6474': 'UR',
  '6475': 'UR', '6476': 'UR', '6482': 'UR', '6484': 'UR', '6485': 'UR',
  '6487': 'UR', '6490': 'UR', '6491': 'UR',
  '8200': 'SH', '8201': 'SH', '8202': 'SH', '8203': 'SH', '8204': 'SH',
  '8205': 'SH', '8206': 'SH', '8207': 'SH', '8208': 'SH', '8209': 'SH',
  '8210': 'SH', '8211': 'SH', '8212': 'SH', '8213': 'SH', '8214': 'SH',
  '8215': 'SH', '8216': 'SH', '8217': 'SH', '8218': 'SH', '8219': 'SH',
  '8220': 'SH',
  '8230': 'ZH', '8231': 'ZH', '8232': 'ZH',
  '8240': 'TG', '8241': 'SH', '8242': 'SH', '8243': 'SH',
  '8245': 'SH', '8246': 'SH', '8247': 'SH',
  '8248': 'ZH', '8249': 'ZH',
  '8252': 'TG', '8253': 'TG', '8254': 'TG', '8255': 'TG',
  '8260': 'SH', '8261': 'SH', '8262': 'SH', '8263': 'SH',
  '9042': 'AR', '9043': 'AR', '9050': 'AI', '9052': 'AI', '9053': 'AI',
  '9054': 'AI', '9055': 'AI', '9056': 'AI', '9057': 'AI', '9058': 'AI',
  '9062': 'AR', '9063': 'AR', '9064': 'AR',
  '9100': 'AR', '9102': 'AR', '9103': 'AR', '9104': 'AR', '9105': 'AR',
  '9107': 'AR', '9108': 'AI', '9112': 'AR',
  '8750': 'GL', '8751': 'GL', '8752': 'GL', '8753': 'GL', '8754': 'GL',
  '8755': 'GL', '8756': 'GL', '8757': 'GL', '8758': 'GL', '8759': 'GL',
  '8760': 'GL', '8761': 'GL', '8762': 'GL', '8765': 'GL', '8766': 'GL',
  '8767': 'GL', '8768': 'GL', '8769': 'GL', '8770': 'GL', '8772': 'GL',
  '8773': 'GL', '8774': 'GL', '8775': 'GL', '8776': 'GL', '8777': 'GL',
  '8782': 'GL', '8783': 'GL', '8784': 'GL',
};

// Specialty name mapping (DE → FR) for the most common ones
// The API returns German names; these are mapped from the specialties endpoint
let specialtyNameMap = {};

function plzToCanton(plz) {
  if (!plz) return null;
  const plzStr = String(plz).trim();
  if (plzExceptions[plzStr]) return plzExceptions[plzStr];
  const num = parseInt(plzStr, 10);
  if (isNaN(num)) return null;
  for (const [min, max, canton] of plzCantonMap) {
    if (num >= min && num <= max) return canton;
  }
  return null;
}

function extractHomepage(titel) {
  if (!titel) return null;
  // Look for external URLs (not register.siwf.ch links)
  const allLinks = [...titel.matchAll(/href="(https?:\/\/[^"]+)"/gi)];
  for (const m of allLinks) {
    if (!m[1].includes('register.siwf.ch') && !m[1].includes('SiwfRegister')) {
      return m[1];
    }
  }
  return null;
}

function extractTextFromHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Execute curl GET and return parsed JSON.
 */
function curlGet(url) {
  const r = spawnSync('curl', ['-s', url, '-H', 'User-Agent: ' + UA, '-H', 'Accept: application/json', '-H', 'Cookie: .AspNetCore.Culture=c%3Dfr%7Cuic%3Dfr'], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('curl GET failed: ' + r.stderr);
  return JSON.parse(r.stdout);
}

/**
 * Execute curl POST with data from a file (avoids shell escaping issues).
 */
function curlPost(url, dataStr, cookieFile) {
  const tmpFile = join(__dirname, '.tmp-post-data.txt');
  writeFileSync(tmpFile, dataStr, 'utf-8');
  const r = spawnSync('curl', [
    '-s', '-b', cookieFile,
    '-X', 'POST', url,
    '-H', 'User-Agent: ' + UA,
    '-H', 'Accept: application/json',
    '-H', 'X-Requested-With: XMLHttpRequest',
    '-H', 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
    '-H', 'Referer: ' + BASE_URL,
    '-d', '@' + tmpFile,
  ], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  try { unlinkSync(tmpFile); } catch {}
  if (r.status !== 0) throw new Error('curl POST failed: ' + r.stderr);
  return JSON.parse(r.stdout);
}

/**
 * Get session cookies from the main page.
 */
function getSession() {
  console.log('  Getting session cookies...');
  const cookieFile = join(__dirname, '.siwf-cookies.txt');
  spawnSync('curl', ['-s', '-c', cookieFile, '-b', '.AspNetCore.Culture=c%3Dfr%7Cuic%3Dfr', BASE_URL, '-H', 'User-Agent: ' + UA], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  return cookieFile;
}

/**
 * Build the form-encoded POST body for IndexPagination.
 */
function buildPaginationBody(draw, start, length) {
  const params = new URLSearchParams();
  params.append('draw', String(draw));
  params.append('start', String(start));
  params.append('length', String(length));
  // DataTable columns (must match exactly)
  DT_COLUMNS.forEach((col, i) => {
    params.append(`columns[${i}][data]`, col.data);
    params.append(`columns[${i}][name]`, '');
    params.append(`columns[${i}][searchable]`, 'true');
    params.append(`columns[${i}][orderable]`, col.orderable ? 'true' : 'false');
    params.append(`columns[${i}][search][value]`, '');
    params.append(`columns[${i}][search][regex]`, 'false');
  });
  params.append('order[0][column]', '0');
  params.append('order[0][dir]', 'asc');
  params.append('search[value]', '');
  params.append('search[regex]', 'false');
  // Form fields (merged by DataTable's data callback)
  params.append('GueltigAm', TODAY);
  params.append('SucheAusgeloest', 'True');
  params.append('TypAuswahl', '2');
  params.append('TypAuswahl', '1');
  return params.toString();
}

// ---- Fetch specialties (Facharzttitel + Schwerpunkte) ----
function fetchSpecialties() {
  console.log('Fetching specialties (Facharzttitel)...');
  const url1 = `${BASE_URL}/LadeFacharzttitel?gueltigAm=${TODAY}`;
  const titles = curlGet(url1);
  console.log(`  Found ${titles.length} specialist titles`);

  console.log('Fetching sub-specialties (Schwerpunkte)...');
  const url2 = `${BASE_URL}/LadeSchwerpunkte?facharztTitelId=0&gueltigAm=${TODAY}`;
  const schwerpunkte = curlGet(url2);
  console.log(`  Found ${schwerpunkte.length} sub-specialties`);

  // Build DE→FR mapping from both sources
  const allEntries = [...titles, ...schwerpunkte];
  for (const s of allEntries) {
    const nameDE = (s.NameDE || s.Name || '').trim();
    const nameFR = (s.NameFR || '').trim();
    if (nameDE && nameFR) specialtyNameMap[nameDE] = nameFR;
  }

  // Return combined list of unique specialties (both titles and sub-specialties)
  const seen = new Set();
  const specialties = allEntries
    .map(s => ({
      id: s.Id,
      name: ((s.NameFR || s.Name || '').trim()),
    }))
    .filter(s => {
      if (!s.name || seen.has(s.name.toLowerCase())) return false;
      seen.add(s.name.toLowerCase());
      return true;
    });
  // Capitalize first letter
  specialties.forEach(s => { s.name = s.name.charAt(0).toUpperCase() + s.name.slice(1); });
  // Sort alphabetically
  specialties.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  console.log(`  Total unique specialties: ${specialties.length}`);
  return specialties;
}

// ---- Fetch establishments (paginated) ----
function fetchEstablishments(cookieFile) {
  console.log('Fetching establishments...');
  let allResults = [];
  let start = 0;
  let draw = 1;
  let totalRecords = Infinity;

  while (start < totalRecords) {
    console.log(`  Page ${draw}: fetching from ${start}...`);
    const body = buildPaginationBody(draw, start, PAGE_SIZE);
    const data = curlPost(`${BASE_URL}/IndexPagination`, body, cookieFile);

    totalRecords = data.TotalRecords ?? 0;
    const records = data.Datasource ?? [];
    allResults.push(...records);
    console.log(`  Got ${records.length} records (total: ${allResults.length}/${totalRecords})`);

    if (totalRecords === 0) break;
    start += PAGE_SIZE;
    draw++;
    if (records.length < PAGE_SIZE) break;
    // Small delay between requests
    spawnSync('ping', ['-n', '1', '-w', '300', '127.0.0.1'], { stdio: 'ignore' });
  }

  console.log(`Total establishments fetched: ${allResults.length}`);
  return allResults;
}

// ---- Translate specialty names DE → FR ----
function translateSpecialty(nameDE) {
  if (!nameDE) return '';
  // Direct lookup
  if (specialtyNameMap[nameDE]) {
    const fr = specialtyNameMap[nameDE];
    return fr.charAt(0).toUpperCase() + fr.slice(1);
  }
  // Case-insensitive lookup
  const lower = nameDE.toLowerCase();
  for (const [de, fr] of Object.entries(specialtyNameMap)) {
    if (de.toLowerCase() === lower) {
      return fr.charAt(0).toUpperCase() + fr.slice(1);
    }
  }
  return nameDE; // Fallback to German name
}

// ---- Transform data ----
function transformEstablishments(raw) {
  return raw.map(r => {
    const name = (r.NameWeiterbildungsstaette || '').trim();
    const titel = r.Titel || '';
    const homepage = extractHomepage(titel);
    const plz = String(r.PLZ || '').trim();
    const city = (r.Ort || '').trim();
    const canton = plzToCanton(plz);
    const director = (r.LeiterWeiterbildungsstaette || '').trim();
    const specialtyDE = (r.Fachgebiet || '').trim();
    const specialty = translateSpecialty(specialtyDE);
    const categoryDE = (r.WBKategorie || '').trim();
    // Translate common category patterns
    const category = categoryDE
      .replace('Kategorie', 'Catégorie')
      .replace('Jahre', 'ans')
      .replace('Jahr', 'an')
      .replace('Arztpraxen', 'Cabinets médicaux');
    const lat = r.Breitenkoordinate ?? null;
    const lng = r.Laengenkoordinate ?? null;

    return {
      id: r.Id,
      name,
      canton,
      plz,
      city,
      director,
      specialty,
      category,
      homepage,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    };
  }).filter(e => e.name && e.id);
}

// ---- Main ----
function main() {
  console.log('=== SIWF Data Fetch ===');
  console.log(`Date: ${TODAY}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    // Fetch specialties (GET, builds DE→FR mapping)
    const specialties = fetchSpecialties();

    // Get session cookies
    const cookieFile = getSession();

    // Fetch establishments (paginated POST)
    const rawEstablishments = fetchEstablishments(cookieFile);

    // Transform
    const establishments = transformEstablishments(rawEstablishments);

    // Stats
    const cantonCounts = {};
    establishments.forEach(e => {
      if (e.canton) cantonCounts[e.canton] = (cantonCounts[e.canton] || 0) + 1;
    });
    const noCantonCount = establishments.filter(e => !e.canton).length;

    console.log('\n=== Stats ===');
    console.log(`Specialties: ${specialties.length}`);
    console.log(`Establishments: ${establishments.length}`);
    console.log(`Without canton: ${noCantonCount}`);
    console.log('By canton:', Object.entries(cantonCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', '));

    // Write files
    writeFileSync(join(OUTPUT_DIR, 'specialties.json'), JSON.stringify(specialties, null, 2), 'utf-8');
    console.log(`\nWrote specialties.json (${specialties.length} entries)`);

    writeFileSync(join(OUTPUT_DIR, 'establishments.json'), JSON.stringify(establishments, null, 2), 'utf-8');
    console.log(`Wrote establishments.json (${establishments.length} entries)`);

    // Cleanup
    try { unlinkSync(cookieFile); } catch {}

    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
