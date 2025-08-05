const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAccessoTable() {
  try {
    console.log('🔍 Checking accesso table...');
    
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accesso'
      ORDER BY ordinal_position
    `);
    console.log('📋 Accesso table columns:', columns.rows);
    
    const accessoUsers = await pool.query('SELECT * FROM accesso LIMIT 5');
    console.log('👤 Accesso users:', accessoUsers.rows);
    
    // Check specific user ID 2
    const user2 = await pool.query('SELECT * FROM accesso WHERE id = $1', [2]);
    console.log('🎯 User ID 2 in accesso:', user2.rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAccessoTable();
