const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAuthSystem() {
  try {
    console.log('🔍 Checking authentication system...');
    
    // Check all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('📋 All tables:', tables.rows.map(r => r.table_name));
    
    // Check if there's an auth table or similar
    const authTables = tables.rows.filter(r => 
      r.table_name.includes('auth') || 
      r.table_name.includes('login') || 
      r.table_name.includes('account')
    );
    console.log('🔐 Auth-related tables:', authTables);
    
    // Check user with ID 2 (current user)
    const currentUser = await pool.query('SELECT * FROM users WHERE id = $1', [2]);
    console.log('👤 Current user (ID 2):', currentUser.rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuthSystem();
