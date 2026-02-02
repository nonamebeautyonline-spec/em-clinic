// Temporary function to fetch specific patient data
function getPatientData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('問診');
  if (!sheet) {
    Logger.log('Sheet not found');
    return;
  }

  var targetPatientIds = [
    '20260100833',
    '20260100743',
    '20260100630',
    '20260100756',
    '20260100798',
    '20260100844'
  ];

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data in sheet');
    return;
  }

  var allData = sheet.getRange(1, 1, lastRow, 30).getValues();
  var headers = allData[0];

  // Find column indices
  var colPatientId = headers.indexOf('patient_id');
  var colPatientName = headers.indexOf('patient_name');
  var colPatientKana = headers.indexOf('patient_kana');
  var colPhone = headers.indexOf('phone');
  var colEmail = headers.indexOf('email');
  var colAnswererId = headers.indexOf('answerer_id');

  Logger.log('Column indices:');
  Logger.log('patient_id: ' + colPatientId);
  Logger.log('patient_name: ' + colPatientName);
  Logger.log('patient_kana: ' + colPatientKana);
  Logger.log('phone: ' + colPhone);
  Logger.log('email: ' + colEmail);

  Logger.log('\n=== Patient Data ===\n');

  for (var i = 1; i < allData.length; i++) {
    var row = allData[i];
    var patientId = String(row[colPatientId]).trim();

    if (targetPatientIds.indexOf(patientId) !== -1) {
      Logger.log('Patient ID: ' + patientId);
      Logger.log('  Name: ' + row[colPatientName]);
      Logger.log('  Kana: ' + row[colPatientKana]);
      Logger.log('  Phone: ' + row[colPhone]);
      Logger.log('  Email: ' + row[colEmail]);
      Logger.log('  Answerer ID: ' + row[colAnswererId]);
      Logger.log('');
    }
  }
}
