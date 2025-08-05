const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUserBookings() {
  try {
    console.log('🔍 Checking bookings for user ID 2...');
    
    const userBookings = await pool.query('SELECT * FROM bookings WHERE user_id = $1', [2]);
    console.log('📊 User 2 bookings:', userBookings.rows.length);
    
    if (userBookings.rows.length === 0) {
      console.log('❌ No bookings found for user 2');
      
      // Check all bookings to see which users have them
      const allBookings = await pool.query('SELECT DISTINCT user_id, COUNT(*) as count FROM bookings GROUP BY user_id ORDER BY user_id');
      console.log('📋 Users with bookings:', allBookings.rows);
      
      // Check if user 2 exists
      const user = await pool.query('SELECT id, email FROM users WHERE id = $1', [2]);
      console.log('👤 User 2 info:', user.rows);
    } else {
      console.log('✅ Found bookings for user 2:', userBookings.rows);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserBookings();
