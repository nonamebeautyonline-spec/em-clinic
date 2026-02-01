import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function search() {
  try {
    // 1. reserve_idで検索
    console.log('=== 1. Searching by reserve_id: resv-1769729904218 ===');
    const byReserveId = await prisma.reservations.findMany({
      where: {
        reserve_id: 'resv-1769729904218'
      }
    });
    console.log('Found by reserve_id:', byReserveId.length);
    if (byReserveId.length > 0) {
      console.log(JSON.stringify(byReserveId, null, 2));
    }
    
    // 2. 2026-01-30 15:15の全予約を取得
    console.log('\n=== 2. All reservations for 2026-01-30 15:15 ===');
    const byDateTime = await prisma.reservations.findMany({
      where: {
        start_at: {
          gte: new Date('2026-01-30T15:15:00+09:00'),
          lt: new Date('2026-01-30T15:16:00+09:00')
        }
      },
      orderBy: { start_at: 'asc' }
    });
    console.log('Found by datetime:', byDateTime.length);
    console.log(JSON.stringify(byDateTime, null, 2));
    
    // 3. reserve_idに20260100211を含むものを探す
    console.log('\n=== 3. Searching reserve_id containing 20260100211 ===');
    const byPartialId = await prisma.reservations.findMany({
      where: {
        reserve_id: {
          contains: '20260100211'
        }
      }
    });
    console.log('Found by partial reserve_id:', byPartialId.length);
    if (byPartialId.length > 0) {
      console.log(JSON.stringify(byPartialId, null, 2));
    }
    
    // 4. patient_id 20260100211の予約
    console.log('\n=== 4. All reservations for patient_id 20260100211 ===');
    const byPatientId = await prisma.reservations.findMany({
      where: {
        patient_id: 20260100211
      },
      orderBy: { start_at: 'desc' },
      take: 5
    });
    console.log('Found by patient_id:', byPatientId.length);
    console.log(JSON.stringify(byPatientId, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

search();
