// Tạo văn bản bản tin tiếng Việt từ data/latest.json để workflow đưa vào bộ tổng hợp giọng (Piper).
// Dùng: node scripts/build-briefing.mjs <thư-mục-đầu-ra>
// Ghi: <out>/briefing.txt (mỗi dòng một câu, số đã đổi thành chữ) và <out>/briefing.json (siêu dữ liệu cho trang).
// Nếu chưa có dữ liệu thu thập thì thoát bình thường mà không ghi gì.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import lib from '../lib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || 'briefing-work');

let latest;
try {
  latest = JSON.parse(await readFile(path.join(root, 'data', 'latest.json'), 'utf8'));
} catch {
  console.log('Chưa có data/latest.json; bỏ qua bản tin âm thanh.');
  process.exit(0);
}
if (!Array.isArray(latest.repositories) || !latest.repositories.length || !Number.isFinite(Date.parse(latest.fetchedAt))) {
  console.log('data/latest.json không hợp lệ; bỏ qua bản tin âm thanh.');
  process.exit(0);
}

const when = new Date(latest.fetchedAt);
const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric' }).formatToParts(when);
const day = Number(parts.find(part => part.type === 'day').value);
const month = Number(parts.find(part => part.type === 'month').value);

const spoken = lib.briefingSentences(latest.repositories, `${lib.numberToVietnamese(day)} tháng ${lib.numberToVietnamese(month)}`, lib.numberToVietnamese).map(lib.speechText);
const display = lib.briefingSentences(latest.repositories, `${day} tháng ${month}`, value => new Intl.NumberFormat('vi-VN').format(value));

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'briefing.txt'), spoken.join('\n') + '\n');
await writeFile(path.join(outDir, 'briefing.json'), JSON.stringify({
  schemaVersion: 1,
  generatedAt: latest.fetchedAt,
  audio: 'briefing.mp3',
  voice: 'Piper vi_VN-vais1000-medium',
  credit: 'Giọng tổng hợp: Piper, model vi_VN-vais1000 (dữ liệu VAIS-1000, CC BY 4.0).',
  sentences: display
}) + '\n');
console.log(`Đã tạo ${spoken.length} câu cho bản tin âm thanh.`);
