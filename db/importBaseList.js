import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { NeonClient } from './NeonClient.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml) {
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1];
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm, text = '';
    while ((tm = tRe.exec(inner)) !== null) text += tm[1];
    out.push(decodeEntities(text));
  }
  return out;
}

function colLetterToIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const rowNum = parseInt(rm[1], 10);
    const cellsXml = rm[2];
    const cells = {};
    const cRe = /<c r="([A-Z]+)\d+"(?:[^>]*?\st="([^"]+)")?[^>]*>([\s\S]*?)<\/c>|<c r="([A-Z]+)\d+"[^>]*\/>/g;
    let cm;
    while ((cm = cRe.exec(cellsXml)) !== null) {
      if (cm[4]) continue;
      const col = colLetterToIndex(cm[1]);
      const type = cm[2];
      const body = cm[3];
      let value = '';
      if (type === 'inlineStr') {
        const tm = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tm ? decodeEntities(tm[1]) : '';
      } else {
        const vm = body.match(/<v>([\s\S]*?)<\/v>/);
        const raw = vm ? vm[1] : '';
        if (type === 's') value = shared[parseInt(raw, 10)] ?? '';
        else value = decodeEntities(raw);
      }
      cells[col] = value;
    }
    rows.push({ rowNum, cells });
  }
  return rows;
}

const TRUE_WORDS = new Set(['כן', 'יש', 'קיים', 'מותקן', 'בוצע', 'בוצעה', 'נדרש', 'true', '1']);
const FALSE_WORDS = new Set(['לא', 'אין', 'לא קיים', 'לא נדרש', '(ללא)', 'ללא', 'לא צריך להיות', 'לא רלוונטי', 'false', '0', '']);

const clean = (v) => (v == null ? '' : String(v).trim());

// Hebrew abbreviations use gershayim (״) / geresh (׳); the source Excel uses ASCII quotes.
const normHeb = (v) => clean(v).replace(/"/g, '\u05F4').replace(/'/g, '\u05F3');

function toBool(v) {
  const s = clean(v);
  if (s === '') return undefined;
  if (TRUE_WORDS.has(s)) return true;
  if (FALSE_WORDS.has(s)) return false;
  return true;
}

function toNum(v) {
  const s = clean(v).replace(/,/g, '');
  if (s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function toCapacity(v) {
  const n = toNum(v);
  return n != null && n >= 0 ? n : 0;
}

function toQty(v) {
  const s = clean(v);
  if (s === '') return 0;
  if (/^\d+$/.test(s.replace(/,/g, ''))) return parseInt(s.replace(/,/g, ''), 10);
  if (TRUE_WORDS.has(s)) return 1;
  return 0;
}

const FIELD_MAP = {
  11: ['mainKitchen', 'str'], 12: ['stoveType', 'str'], 13: ['salon', 'bool'],
  14: ['macshRoom', 'bool'], 15: ['lightTable', 'bool'], 16: ['lightBox', 'bool'],
  17: ['flourMachine', 'bool'], 18: ['riceMachine', 'bool'], 19: ['riceMachineSize', 'str'],
  20: ['warmCabinetWithDevice', 'num'], 21: ['warmCabinetNoDevice', 'num'], 22: ['heatingPlates', 'num'],
  23: ['plateSeparatorMilk', 'num'], 24: ['plateCoverShabbat', 'bool'], 25: ['galeyShabbat', 'bool'],
  26: ['pesachStore', 'bool'], 27: ['kitchenettes', 'num'], 28: ['kitchenNotes', 'str'],
  29: ['eruv', 'str'], 30: ['sgEntryShape', 'str'], 31: ['rakemEruv', 'bool'],
  32: ['eruvPolesNeeded', 'num'], 33: ['eruvNotes', 'str'], 34: ['waterPressurePump', 'bool'],
  35: ['shabbatAdaptation', 'bool'], 36: ['sgShabbatDeviceNeeded', 'bool'], 37: ['sgShabbatDevicesNeeded', 'num'],
  38: ['sgShabbatDevicesInstalled', 'num'], 39: ['iceMachines', 'num'], 40: ['iceMachineDevice', 'bool'],
  41: ['shabbatNotes', 'str'], 42: ['mezuzotResidentialNeeded', 'num'], 43: ['mezuzotResidentialInstalled', 'num'],
  44: ['mezuzotOtherNeeded', 'num'], 45: ['mezuzotOtherInstalled', 'num'], 46: ['mezuzotNotes', 'str'],
  47: ['synagogueExists', 'bool'], 48: ['synagogueStatus', 'str'], 49: ['seatsMen', 'num'],
  50: ['seatsWomen', 'num'], 51: ['separateEntranceWomen', 'bool'], 52: ['hasNetilatHandwash', 'bool'],
  53: ['gnizaBox', 'bool'], 54: ['synagogueNotes', 'str'], 55: ['arkKodesh', 'bool'],
  56: ['parochet', 'bool'], 57: ['bimaReading', 'bool'], 58: ['bimaCover', 'bool'],
  59: ['chazzanStand', 'bool'], 60: ['chazzanStandCover', 'bool'], 61: ['bookCabinets', 'num'],
  62: ['bookShelves', 'num'], 63: ['synagogueContentsNotes', 'str'], 64: ['torahScrolls', 'num'],
};

const INVENTORY_MAP = {
  52: 'kiyor_netilat', 53: 'genizah', 55: 'aron_kodesh', 56: 'parochet', 57: 'bimat_kria',
  58: 'kisuy_teva', 59: 'amud_tfila', 60: 'kisuy_chazan', 61: 'aron_sfarim', 62: 'koniyot',
  64: 'sefer_torah', 65: 'talit', 66: 'talit_gadol', 67: 'tefilin', 68: 'chumash', 69: 'kipa',
  70: 'luach', 71: 'sidur_ashkenaz', 72: 'sidur_sfard', 73: 'sidur_edot', 74: 'tanach', 75: 'tehilim',
  76: 'torat_hamahane_full', 77: 'torat_hamahane_short', 78: 'natla', 79: 'shofar', 80: 'kitel',
  81: 'slichot_ashkenaz', 82: 'slichot_edot', 83: 'chanukia_big', 84: 'megila_klaf', 85: 'megila_dfus',
  86: 'tikun_shavuot', 87: 'kinot', 88: 'mahzor_aw_ashkenaz', 89: 'mahzor_aw_sfard', 90: 'mahzor_aw_edot',
  91: 'mahzor_aw_shaliach', 92: 'mahzor_sukot_edot', 93: 'mahzor_pesach_edot', 94: 'mahzor_shavuot_edot',
  95: 'chanukiot_pach', 96: 'sukah_3x6',
};

function buildFacility(row) {
  const c = row.cells;
  const name = clean(c[0]);
  if (!name) return null;

  const fields = {};
  for (const [idx, [key, type]] of Object.entries(FIELD_MAP)) {
    const raw = c[idx];
    if (clean(raw) === '') continue;
    let val;
    if (type === 'bool') val = toBool(raw);
    else if (type === 'num') val = toNum(raw);
    else val = clean(raw);
    if (val !== undefined && val !== '') fields[key] = val;
  }

  const inventory = [];
  for (const [idx, itemId] of Object.entries(INVENTORY_MAP)) {
    if (clean(c[idx]) === '') continue;
    inventory.push({ itemId, qty: toQty(c[idx]) });
  }

  return {
    id: `fac_xls_${row.rowNum}`,
    name,
    command: normHeb(c[1]) || 'לא ידוע',
    division: normHeb(c[2]) || null,
    brigade: normHeb(c[3]) || null,
    battalion: normHeb(c[4]) || null,
    campType: clean(c[5]) || null,
    status: clean(c[6]) || null,
    project: clean(c[7]) || null,
    maxCapacity: toCapacity(c[8]),
    mealCapacity: toCapacity(c[10]),
    notes: clean(c[9]) || null,
    fields,
    inventory,
  };
}

async function chunkedInsert(client, label, columns, tuples, rowParams, conflict) {
  const CHUNK = 80;
  let done = 0;
  for (let i = 0; i < tuples.length; i += CHUNK) {
    const slice = tuples.slice(i, i + CHUNK);
    const params = [];
    const valueSql = slice
      .map((t) => {
        const ph = rowParams(t, params);
        return `(${ph})`;
      })
      .join(', ');
    const sql = `INSERT INTO ${label} (${columns.join(', ')}) VALUES ${valueSql} ${conflict}`;
    await client.query(sql, params);
    done += slice.length;
    process.stdout.write(`  ${label}: ${done}/${tuples.length}\n`);
  }
}

async function main() {
  loadEnv();
  const conn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!conn) { console.error('Missing DATABASE_URL'); process.exit(1); }
  const client = new NeonClient(conn);

  const xlsxDir = process.argv[2] || path.join('C:', 'Users', 'nihug', 'AppData', 'Local', 'Temp', 'amir_xlsx', 'x');
  const shared = parseSharedStrings(fs.readFileSync(path.join(xlsxDir, 'xl', 'sharedStrings.xml'), 'utf8'));
  const sheet = parseSheet(fs.readFileSync(path.join(xlsxDir, 'xl', 'worksheets', 'sheet1.xml'), 'utf8'), shared);
  const dataRows = sheet.filter((r) => r.rowNum > 1);

  const facilities = dataRows.map(buildFacility).filter(Boolean);
  console.log(`Parsed ${facilities.length} facilities from base list.`);

  await chunkedInsert(
    client, 'facilities',
    ['id', 'name', 'command', 'division', 'brigade', 'battalion', 'camp_type', 'status', 'project', 'max_capacity', 'meal_capacity', 'notes', 'fields', 'active', 'updated_by'],
    facilities,
    (f, params) => {
      const start = params.length;
      params.push(f.id, f.name, f.command, f.division, f.brigade, f.battalion, f.campType, f.status, f.project, f.maxCapacity, f.mealCapacity, f.notes, JSON.stringify(f.fields), true, 'import:base-list');
      return Array.from({ length: 15 }, (_, k) => `$${start + k + 1}${k === 12 ? '::jsonb' : ''}`).join(', ');
    },
    `ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, command = EXCLUDED.command, division = EXCLUDED.division,
       brigade = EXCLUDED.brigade, battalion = EXCLUDED.battalion, camp_type = EXCLUDED.camp_type,
       status = EXCLUDED.status, project = EXCLUDED.project, max_capacity = EXCLUDED.max_capacity,
       meal_capacity = EXCLUDED.meal_capacity, notes = EXCLUDED.notes, fields = EXCLUDED.fields,
       active = TRUE, updated_by = EXCLUDED.updated_by, updated_at = NOW()`
  );

  const invTuples = [];
  for (const f of facilities) {
    for (const inv of f.inventory) invTuples.push({ facilityId: f.id, itemId: inv.itemId, qty: inv.qty });
  }
  console.log(`Inserting ${invTuples.length} inventory rows.`);

  await chunkedInsert(
    client, 'facility_inventory',
    ['facility_id', 'item_id', 'quantity', 'updated_by'],
    invTuples,
    (t, params) => {
      const start = params.length;
      params.push(t.facilityId, t.itemId, t.qty, 'import:base-list');
      return `$${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}`;
    },
    `ON CONFLICT (facility_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_by = EXCLUDED.updated_by, updated_at = NOW()`
  );

  const r = await client.query('SELECT COUNT(*)::int AS c FROM facilities');
  const total = r.rows?.[0]?.c ?? r.rows?.[0]?.[0];
  console.log(`\n✓ done. facilities table now has ${total} rows.`);
}

main().catch((e) => { console.error('✗ failed:', e.message); process.exit(1); });
