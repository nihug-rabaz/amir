import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { NeonClient } from './NeonClient.js';

const envPath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const c = new NeonClient(process.env.DATABASE_URL);
const r = await c.query('SELECT NOW() as now, current_database() as db, version() as v');
console.log(JSON.stringify(r, null, 2));
