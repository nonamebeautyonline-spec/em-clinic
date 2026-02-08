// 24人分のRedisキャッシュを一括削除
import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ids = [
  '20260200560','20260200458','20260200453','20260200504','20260200565',
  '20260200568','20260200581','20260200582','20260200583','20260200587',
  '20260200586','20260200562','20260200571','20260200314','20260200579',
  '20260200585','20260200577','20260200588','20260100110','20260200570',
  '20260200572','20260200576','20260200580','20260200346'
];

let deleted = 0;
for (const id of ids) {
  const key = `dashboard:${id}`;
  const result = await redis.del(key);
  if (result > 0) {
    console.log(`DEL ${key} -> OK`);
    deleted++;
  } else {
    console.log(`DEL ${key} -> (not found)`);
  }
}
console.log(`\n削除完了: ${deleted}件`);
