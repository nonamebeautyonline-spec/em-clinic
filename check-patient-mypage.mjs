// 患者20260101214のマイページデータを確認
const pid = '20260101214';
const res = await fetch('https://app.noname-beauty.jp/api/admin/view-mypage?patient_id=' + pid, {
  headers: { 'Authorization': 'Bearer secret' }
});
const data = await res.json();

console.log('=== Mypage Data for 20260101214 ===');
console.log('Source:', data.source);
console.log('');
console.log('Has nextReservation:', !!data.data?.nextReservation);
console.log('Has orders:', data.data?.orders?.length || 0);
console.log('Has activeOrders:', data.data?.activeOrders?.length || 0);
console.log('Has history:', data.data?.history?.length || 0);
console.log('');
console.log('Orders:');
console.log(JSON.stringify(data.data?.orders || [], null, 2));
console.log('');
console.log('History:');
console.log(JSON.stringify(data.data?.history || [], null, 2));
console.log('');
console.log('Flags:');
console.log(JSON.stringify(data.data?.ordersFlags || {}, null, 2));
console.log('');
console.log('hasIntake:', data.data?.hasIntake);
console.log('intakeId:', data.data?.intakeId);
