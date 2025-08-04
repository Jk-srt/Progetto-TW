import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error('[ERROR] DATABASE_URL not found in environment variables');
      throw new Error('DATABASE_URL not configured');
    }
    
    console.log('[DEBUG] Creating database pool with URL:', process.env.DATABASE_URL.substring(0, 50) + '...');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  
  return pool;
}

export default getPool();

