import { Pool } from 'pg';

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('[ERROR] DATABASE_URL not found in environment variables');
      throw new Error('DATABASE_URL not configured');
    }
    const useSSL = (process.env.DB_SSL || '').toLowerCase() === 'true' || url.includes('sslmode=require');
    console.log('[DB] Creating pool. SSL=', useSSL, ' URL(head)=', url.substring(0, 60) + '...');
    _pool = new Pool({
      connectionString: url,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined
    });
  }
  return _pool;
}

export const pool = getPool();
export default pool;

