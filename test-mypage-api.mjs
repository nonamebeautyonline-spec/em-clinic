// test-mypage-api.mjs
// マイページAPIを直接呼び出してキャッシュの動作を確認

const APP_BASE_URL = "https://em-clinic-5num.vercel.app"; // 本番URL
const TEST_PATIENT_ID = process.argv[2] || "20251200128";

console.log(`=== Testing Mypage API for patient ${TEST_PATIENT_ID} ===`);

// Cookie設定（患者IDを渡す）
const cookieHeader = `patient_id=${TEST_PATIENT_ID}`;

async function callMypageAPI(attempt) {
  console.log(`\n--- Attempt ${attempt} ---`);
  const start = Date.now();

  try {
    const response = await fetch(`${APP_BASE_URL}/api/mypage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    const elapsed = Date.now() - start;
    console.log(`✓ Status: ${response.status}`);
    console.log(`✓ Time: ${elapsed}ms`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Response keys:`, Object.keys(data));
      if (data.reorders) {
        console.log(`  - Reorders count: ${data.reorders.length}`);
      }
    } else {
      console.log(`✗ Error response`);
    }

    return elapsed;
  } catch (error) {
    console.error(`✗ Request failed:`, error.message);
    return null;
  }
}

// 2回連続で呼び出してキャッシュ効果を確認
(async () => {
  const time1 = await callMypageAPI(1);
  await new Promise((r) => setTimeout(r, 2000)); // 2秒待機
  const time2 = await callMypageAPI(2);

  if (time1 && time2) {
    console.log(`\n=== Results ===`);
    console.log(`1st call: ${time1}ms`);
    console.log(`2nd call: ${time2}ms`);
    const diff = time1 - time2;
    const speedup = ((diff / time1) * 100).toFixed(1);

    if (time2 < time1 * 0.3) {
      console.log(`✓ Cache appears to be working! (${speedup}% faster)`);
    } else {
      console.log(`✗ Cache may not be working (only ${speedup}% faster)`);
    }
  }
})();
