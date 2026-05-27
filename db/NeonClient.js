import { URL } from 'node:url';

export class NeonClient {
  constructor(connectionString) {
    if (!connectionString) throw new Error('Missing Neon connection string');
    this.connectionString = connectionString;
    const u = new URL(connectionString);
    this.host = u.host;
    this.endpoint = `https://${u.host}/sql`;
  }

  async query(sql, params = []) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': this.connectionString,
        'Neon-Pool-Opt-In': 'true',
        'Neon-Batch-Read-Only': 'false',
      },
      body: JSON.stringify({ query: sql, params }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Neon HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    try { return JSON.parse(text); }
    catch (e) { return { raw: text }; }
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      const r = await this.query(trimmed);
      results.push(r);
    }
    return results;
  }
}

export function splitSql(sql) {
  const stmts = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next2 = sql.slice(i, i + 2);

    if (!inSingle && !inDouble && !inDollar && next2 === '--') {
      while (i < sql.length && sql[i] !== '\n') { current += sql[i]; i++; }
      continue;
    }

    if (!inSingle && !inDouble && !inDollar && ch === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) { inDollar = true; dollarTag = m[0]; current += dollarTag; i += dollarTag.length - 1; continue; }
    }
    if (inDollar && sql.slice(i, i + dollarTag.length) === dollarTag) {
      current += dollarTag; i += dollarTag.length - 1; inDollar = false; dollarTag = ''; continue;
    }

    if (!inDouble && !inDollar && ch === "'") inSingle = !inSingle;
    else if (!inSingle && !inDollar && ch === '"') inDouble = !inDouble;

    if (ch === ';' && !inSingle && !inDouble && !inDollar) {
      stmts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) stmts.push(current.trim());
  return stmts.filter(s => s.length > 0);
}
