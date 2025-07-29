import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // eventuali opzioni SSL se usi Neon/Heroku
  ssl: { rejectUnauthorized: false }
});

export default pool;
