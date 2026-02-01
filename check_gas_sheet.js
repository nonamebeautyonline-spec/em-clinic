const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1j932bAhjOAN1fF55gU07F4VRMWi9yTphoejCGJHFwuo';
const PATIENT_ID = '20260100211';

async function checkGASSheet() {
  try {
    // This would require Google credentials
    // Let's check if there's a credentials file
    console.log('Checking for Google credentials...');
    
    const credPaths = [
      '/Users/administer/em-clinic/credentials.json',
      '/Users/administer/em-clinic/google-credentials.json',
      '/Users/administer/em-clinic/.credentials/google.json'
    ];
    
    let credPath = null;
    for (const p of credPaths) {
      if (fs.existsSync(p)) {
        credPath = p;
        console.log('Found credentials at:', p);
        break;
      }
    }
    
    if (!credPath) {
      console.log('No Google credentials file found in common locations');
      console.log('Searched:', credPaths);
      return;
    }
    
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    console.log('Credentials loaded successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkGASSheet();
