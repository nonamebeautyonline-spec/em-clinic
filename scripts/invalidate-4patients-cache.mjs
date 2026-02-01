import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const problemPatients = ['20260100043', '20260100379', '20260100903', '20260100482'];

async function invalidateCaches() {
  console.log('=== 4名の患者キャッシュを無効化 ===\n');

  const vercelUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.error('❌ ADMIN_TOKEN が設定されていません');
    return;
  }

  console.log(`Vercel URL: ${vercelUrl}\n`);

  for (const pid of problemPatients) {
    try {
      const res = await fetch(`${vercelUrl}/api/admin/invalidate-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          patient_id: pid,
        }),
      });

      if (res.ok) {
        console.log(`✅ キャッシュ無効化成功: ${pid}`);
      } else {
        const text = await res.text();
        console.error(`❌ キャッシュ無効化失敗 [${pid}]: ${res.status} ${text}`);
      }
    } catch (e) {
      console.error(`❌ エラー [${pid}]:`, e.message);
    }
  }

  console.log('\n✅ 全4名のキャッシュ無効化完了');
}

invalidateCaches().catch(console.error);
