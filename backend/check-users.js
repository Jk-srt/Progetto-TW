const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUserTable() {
  try {
    console.log('🔍 Checking users table structure...');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('📋 Users table columns:', columns.rows);
    
    const sampleUsers = await pool.query('SELECT * FROM users LIMIT 3');
    console.log('👤 Sample users:', sampleUsers.rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserTable();
