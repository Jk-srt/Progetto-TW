const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_VATdkwzO94Wr@ep-holy-water-a2lusn2u-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkDatabase() {
  try {
    // Check table structure
    const tableResult = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'flights' ORDER BY ordinal_position;"
    );
    console.log('=== FLIGHTS TABLE STRUCTURE ===');
    console.log(tableResult.rows);
    
    // Check some flight data
    const flightResult = await pool.query(
      'SELECT id, flight_number, airline_id FROM flights LIMIT 3;'
    );
    console.log('\n=== SAMPLE FLIGHT DATA ===');
    console.log(flightResult.rows);
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

checkDatabase();
