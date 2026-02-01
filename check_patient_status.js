const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function checkPatientStatus() {
  const patientIds = ['20260100211', '20260101576', '20260101632'];
  const targetDate = '2026-01-30';
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local file');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('='.repeat(80));
  console.log('CHECKING PATIENT STATUS');
  console.log('='.repeat(80));
  console.log('Patients: ' + patientIds.join(', '));
  console.log('Date: ' + targetDate);
  console.log('='.repeat(80));

  for (const patientId of patientIds) {
    console.log('\n' + '*'.repeat(80));
    console.log('PATIENT: ' + patientId);
    console.log('*'.repeat(80));

    // Check reservations table - using reserved_date instead of date
    console.log('\n--- RESERVATIONS TABLE ---');
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select('reserve_id, status, reserved_date, reserved_time')
      .eq('patient_id', patientId)
      .eq('reserved_date', targetDate)
      .order('reserved_time');

    if (resError) {
      console.log('  Error querying reservations:', resError.message);
    } else if (reservations && reservations.length > 0) {
      console.log('Found ' + reservations.length + ' reservation(s):');
      reservations.forEach((res, idx) => {
        console.log('  [' + (idx + 1) + '] Reserve ID: ' + res.reserve_id);
        console.log('      Status: ' + res.status);
        console.log('      Date: ' + res.reserved_date);
        console.log('      Time: ' + res.reserved_time);
      });
    } else {
      console.log('  No reservations found for ' + targetDate);
    }

    // Check intake table
    console.log('\n--- INTAKE TABLE ---');
    const { data: intakes, error: intakeError } = await supabase
      .from('intake')
      .select('reserve_id, reserved_date, reserved_time, status')
      .eq('patient_id', patientId)
      .order('reserved_date', { ascending: false })
      .order('reserved_time', { ascending: false })
      .limit(10);

    if (intakeError) {
      console.log('  Error querying intake:', intakeError.message);
    } else if (intakes && intakes.length > 0) {
      console.log('Found ' + intakes.length + ' intake record(s):');
      intakes.forEach((intake, idx) => {
        console.log('  [' + (idx + 1) + '] Reserve ID: ' + (intake.reserve_id || 'null'));
        console.log('      Status: ' + (intake.status || 'null'));
        console.log('      Reserved Date: ' + (intake.reserved_date || 'null'));
        console.log('      Reserved Time: ' + (intake.reserved_time || 'null'));
      });
    } else {
      console.log('  No intake records found');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('QUERY COMPLETE');
  console.log('='.repeat(80));
}

checkPatientStatus().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
