import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { NeonClient, splitSql } from './NeonClient.js';
import { buildSeedStatements } from './seedData.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

class Migrator {
  constructor(client) {
    this.client = client;
  }

  async runSchema() {
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = splitSql(sql);
    console.log(`\n[schema] applying ${statements.length} statements...`);
    let i = 0;
    for (const stmt of statements) {
      i++;
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
      try {
        await this.client.query(stmt);
        process.stdout.write(`  [${i}/${statements.length}] OK  ${preview}\n`);
      } catch (e) {
        console.error(`  [${i}/${statements.length}] FAIL ${preview}`);
        throw e;
      }
    }
  }

  async runSeed() {
    const stmts = buildSeedStatements();
    console.log(`\n[seed] applying ${stmts.length} statements...`);
    let i = 0;
    for (const { sql, params } of stmts) {
      i++;
      try {
        await this.client.query(sql, params);
        if (i % 25 === 0 || i === stmts.length) {
          process.stdout.write(`  [${i}/${stmts.length}] OK\n`);
        }
      } catch (e) {
        console.error(`  [${i}/${stmts.length}] FAIL`);
        console.error('   SQL:', sql.slice(0, 200));
        console.error('   PARAMS:', JSON.stringify(params).slice(0, 200));
        throw e;
      }
    }
  }

  async verify() {
    console.log('\n[verify] counting rows:');
    const tables = [
      'commands', 'divisions', 'brigades', 'battalions',
      'users', 'inventory_items', 'standard_tiers', 'standards',
      'facilities', 'facility_inventory', 'audit_log',
    ];
    for (const t of tables) {
      const r = await this.client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
      const count = r.rows?.[0]?.c ?? r.rows?.[0]?.[0] ?? '?';
      console.log(`  ${t.padEnd(22)} ${count}`);
    }
    console.log('\n[verify] sample compliance:');
    const c = await this.client.query(
      `SELECT facility_name, tier_label, total_gap, missing_items
       FROM v_facility_compliance ORDER BY total_gap DESC LIMIT 5`
    );
    const rows = c.rows || [];
    for (const r of rows) {
      const name = r.facility_name ?? r[0];
      const tier = r.tier_label ?? r[1];
      const gap = r.total_gap ?? r[2];
      const miss = r.missing_items ?? r[3];
      console.log(`  ${String(name).padEnd(30)} ${String(tier).padEnd(22)} gap=${gap}  missing=${miss}`);
    }
  }
}

async function main() {
  loadEnv();
  const conn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!conn) {
    console.error('Missing DATABASE_URL. Put it in .env or environment.');
    process.exit(1);
  }
  const client = new NeonClient(conn);
  const mode = process.argv[2] || 'all';
  const migrator = new Migrator(client);

  console.log(`AMIR 2.0 migration  ->  ${client.host}`);
  console.log(`mode: ${mode}`);

  try {
    if (mode === 'schema' || mode === 'all') await migrator.runSchema();
    if (mode === 'seed' || mode === 'all') await migrator.runSeed();
    if (mode === 'verify' || mode === 'all') await migrator.verify();
    console.log('\n✓ done');
  } catch (e) {
    console.error('\n✗ failed:', e.message);
    process.exit(1);
  }
}

main();
