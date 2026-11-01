#!/usr/bin/env node
// 整合 T4 團隊回合：三位工程師各自的 repo → 一個可評分的 src/。
//
//   node assemble-team.mjs <團隊回合目錄>
//
// 團隊回合目錄底下有 order/、inventory/、payment/ 三個工程師的專案。
// 只取每位工程師負責的那一個檔案；共用的 events.ts 與 shop.ts 一律用 tasks/t4/team-src/ 的原版，
// 所以就算有人改了共用檔，也不會帶進整合結果。輸出到 <團隊回合目錄>/src/。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.join(HERE, 'tasks', 't4', 'team-src');
const OWNERS = ['order', 'inventory', 'payment'];

const dir = process.argv[2];
if (!dir) { console.error('用法：node assemble-team.mjs <團隊回合目錄>'); process.exit(2); }

const out = path.join(dir, 'src');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['events.ts', 'shop.ts']) fs.copyFileSync(path.join(SHARED, f), path.join(out, f));
for (const svc of OWNERS) {
  const src = path.join(dir, svc, 'src', `${svc}.ts`);
  if (!fs.existsSync(src)) { console.error(`缺少 ${src}`); process.exit(1); }
  fs.copyFileSync(src, path.join(out, `${svc}.ts`));
  // 工程師若另外拆了輔助檔，一併帶上（不覆蓋共用檔與他人的檔案）
  for (const extra of fs.readdirSync(path.join(dir, svc, 'src'))) {
    if (['events.ts', 'shop.ts', 'index.ts', ...OWNERS.map((o) => `${o}.ts`)].includes(extra)) continue;
    fs.cpSync(path.join(dir, svc, 'src', extra), path.join(out, extra), { recursive: true });
  }
}
console.log(`已整合到 ${out}`);
