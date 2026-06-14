import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not defined. Add it to .env.local');
  _sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  return _sql;
}

export type DbRow = Record<string, unknown>;
