const https = require('https');

const GAS_RESERVATIONS_URL = 'https://script.google.com/macros/s/AKfycbwX4RihUris1ZN-Ungo8D1QOhNCGQHiPq9XK7W33F7p6DVVJFFdsZ0MU5lHZitEevBqnA/exec';

function queryGAS(patientId) {
  return new Promise((resolve, reject) => {
    const url = GAS_RESERVATIONS_URL + '?patient_id=' + patientId;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (e) {
          resolve({ raw: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

(async () => {
  try {
    console.log('=== GAS予約APIの確認 ===\n');
    console.log('Patient ID: 20260100211');
    console.log('API URL: ' + GAS_RESERVATIONS_URL);
    console.log('\nクエリ中...\n');
    
    const result = await queryGAS('20260100211');
    
    console.log('=== 結果 ===');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
