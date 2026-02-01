// scripts/test-promise-allsettled-error.mjs
// Promise.allSettledでエラーがどう扱われるかテスト

async function retrySupabaseWrite(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`[Retry] Success on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Retry] Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = delayMs * attempt;
        console.log(`[Retry] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function testErrorHandling() {
  console.log("=== Promise.allSettled エラーハンドリングテスト ===\n");

  // テスト1: throwするoperation
  console.log("【テスト1】operationが常にエラーを投げる場合");

  const [result1] = await Promise.allSettled([
    retrySupabaseWrite(async () => {
      console.log("  operation実行中...");
      const fakeResult = { error: { message: "Test error", code: "42501" } };

      if (fakeResult.error) {
        throw fakeResult.error;
      }
      return fakeResult;
    })
  ]);

  console.log("  Promise.allSettled result:");
  console.log("    status:", result1.status);

  if (result1.status === "rejected") {
    console.log("    reason:", result1.reason);
  } else if (result1.status === "fulfilled") {
    console.log("    value:", result1.value);
    console.log("    value.error:", result1.value?.error);
  }

  // テスト2: errorプロパティを持つ結果を返す（throwしない）
  console.log("\n【テスト2】operationがerrorプロパティを持つ結果を返す場合");

  const [result2] = await Promise.allSettled([
    retrySupabaseWrite(async () => {
      console.log("  operation実行中...");
      const fakeResult = {
        error: { message: "Test error", code: "42501" },
        data: null,
        status: 400
      };

      // ★ /api/intakeと同じロジック：result.errorがあればthrow
      if (fakeResult.error) {
        throw fakeResult.error;
      }
      return fakeResult;
    })
  ]);

  console.log("  Promise.allSettled result:");
  console.log("    status:", result2.status);

  if (result2.status === "rejected") {
    console.log("    reason:", result2.reason);
    console.log("\n  ✅ エラーチェックの条件:");
    console.log("    result.status === 'rejected':", result2.status === "rejected");
  } else if (result2.status === "fulfilled") {
    console.log("    value:", result2.value);
    console.log("    value.error:", result2.value?.error);
  }

  // テスト3: 成功する場合
  console.log("\n【テスト3】operationが成功する場合");

  const [result3] = await Promise.allSettled([
    retrySupabaseWrite(async () => {
      console.log("  operation実行中...");
      return { error: null, data: [{ id: 1 }], status: 201 };
    })
  ]);

  console.log("  Promise.allSettled result:");
  console.log("    status:", result3.status);
  console.log("    value.error:", result3.value?.error);
  console.log("    value.data:", result3.value?.data);

  console.log("\n【結論】");
  console.log("- operationがthrowした場合 → Promise.allSettledのstatusは'rejected'");
  console.log("- /api/intakeのエラーチェックは以下の条件:");
  console.log("  if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error))");
  console.log("- throwすればrejectedになるので、エラーは検出できるはず");
}

testErrorHandling();
