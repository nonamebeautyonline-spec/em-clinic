import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function search() {
  const client = await pool.connect();
  
  try {
    console.log('=== 1. Searching by reserve_id: resv-1769729904218 ===');
    const res1 = await client.query(
      'SELECT * FROM reservations WHERE reserve_id = $1',
      ['resv-1769729904218']
    );
    console.log('Found by reserve_id:', res1.rows.length);
    if (res1.rows.length > 0) {
      console.log(JSON.stringify(res1.rows, null, 2));
    }
    
    console.log('\n=== 2. All reservations for 2026-01-30 15:15 ===');
    const res2 = await client.query(
      "SELECT * FROM reservations WHERE start_at >= '2026-01-30 15:15:00+09' AND start_at < '2026-01-30 15:16:00+09' ORDER BY start_at"
    );
    console.log('Found by datetime:', res2.rows.length);
    if (res2.rows.length > 0) {
      console.log(JSON.stringify(res2.rows, null, 2));
    }
    
    console.log('\n=== 3. Searching reserve_id containing 20260100211 ===');
    const res3 = await client.query(
      "SELECT * FROM reservations WHERE reserve_id LIKE '%20260100211%'"
    );
    console.log('Found by partial reserve_id:', res3.rows.length);
    if (res3.rows.length > 0) {
      console.log(JSON.stringify(res3.rows, null, 2));
    }
    
    console.log('\n=== 4. All reservations for patient_id 20260100211 ===');
    const res4 = await client.query(
      'SELECT * FROM reservations WHERE patient_id = $1 ORDER BY start_at DESC LIMIT 5',
      [20260100211]
    );
    console.log('Found by patient_id:', res4.rows.length);
    if (res4.rows.length > 0) {
      console.log(JSON.stringify(res4.rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

search();
