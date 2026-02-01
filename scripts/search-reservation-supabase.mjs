import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function search() {
  try {
    console.log('=== GASシートからの情報 ===');
    console.log('reserve_id: resv-1769729904218');
    console.log('patient_id: 20260100211 (number)');
    console.log('reserved_date: 2026-01-30');
    console.log('reserved_time: 15:15');
    console.log('');
    
    console.log('=== 1. Searching by reserve_id: resv-1769729904218 ===');
    const { data: data1, error: error1 } = await supabase
      .from('reservations')
      .select('*')
      .eq('reserve_id', 'resv-1769729904218');
    
    if (error1) console.error('Error:', error1);
    else {
      console.log('Found by reserve_id:', data1.length);
      if (data1.length > 0) {
        console.log(JSON.stringify(data1, null, 2));
        console.log('\n** 重要: patient_idが文字列型 "20260100211" でDBに保存されています！**');
      }
    }
    
    console.log('\n=== 2. patient_id検索（文字列型） ===');
    const { data: data2, error: error2 } = await supabase
      .from('reservations')
      .select('*')
      .eq('patient_id', '20260100211');
    
    if (error2) console.error('Error:', error2);
    else {
      console.log('Found by patient_id (string):', data2.length);
      if (data2.length > 0) {
        console.log(JSON.stringify(data2, null, 2));
      }
    }
    
    console.log('\n=== 3. patient_id検索（数値型） ===');
    const { data: data3, error: error3 } = await supabase
      .from('reservations')
      .select('*')
      .eq('patient_id', 20260100211);
    
    if (error3) console.error('Error:', error3);
    else {
      console.log('Found by patient_id (number):', data3.length);
      if (data3.length > 0) {
        console.log(JSON.stringify(data3, null, 2));
      }
    }
    
    console.log('\n=== 4. 2026-01-30の全予約 ===');
    const { data: data4, error: error4 } = await supabase
      .from('reservations')
      .select('*')
      .eq('reserved_date', '2026-01-30')
      .order('reserved_time', { ascending: true });
    
    if (error4) console.error('Error:', error4);
    else {
      console.log('Found for 2026-01-30:', data4.length);
      console.log('15:15の予約:');
      const filtered = data4.filter(r => r.reserved_time === '15:15:00');
      console.log(JSON.stringify(filtered, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

search();
