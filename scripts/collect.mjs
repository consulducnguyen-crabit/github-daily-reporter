// Thu thập dữ liệu GitHub hằng ngày -> data/latest.json và data/history.json.
// Chạy trong GitHub Actions (có GITHUB_TOKEN) hoặc cục bộ: `node scripts/collect.mjs`.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import lib from '../lib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'github-daily-collector',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};

const keepFields = repo => ({
  id: repo.id,
  full_name: repo.full_name,
  description: repo.description,
  language: repo.language,
  stargazers_count: repo.stargazers_count,
  forks_count: repo.forks_count,
  open_issues_count: repo.open_issues_count,
  html_url: repo.html_url,
  homepage: repo.homepage || null,
  owner: { avatar_url: repo.owner?.avatar_url },
  topics: repo.topics || [],
  created_at: repo.created_at,
  pushed_at: repo.pushed_at,
  license: repo.license ? { spdx_id: repo.license.spdx_id } : null
});

async function search(query, perPage) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}&page=1`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub Search API lỗi ${response.status} cho truy vấn: ${query}`);
  const data = await response.json();
  return data.items || [];
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const now = new Date();
const since = new Date(now.getTime() - 30 * lib.DAY).toISOString().slice(0, 10);

// Hai nhóm: repo nhiều sao còn hoạt động, và repo mới tạo trong 30 ngày đang lên.
const [established, rising] = await Promise.all([
  search(`stars:>500 pushed:>${since} archived:false`, 100),
  search(`created:>${since} stars:>100 archived:false`, 50)
]);

const byId = new Map();
for (const repo of [...established, ...rising]) if (!byId.has(repo.id)) byId.set(repo.id, keepFields(repo));
const repositories = [...byId.values()].sort((a, b) => b.stargazers_count - a.stargazers_count);
if (!repositories.length) throw new Error('Không thu thập được repository nào; giữ nguyên dữ liệu cũ.');

const fetchedAt = now.toISOString();
const stars = Object.fromEntries(repositories.map(repo => [repo.id, repo.stargazers_count]));
const history = await readJson(path.join(dataDir, 'history.json'), { schemaVersion: 1, records: [] });
const records = lib.mergeServerHistory(Array.isArray(history.records) ? history.records : [], fetchedAt, stars);

await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, 'latest.json'), JSON.stringify({ schemaVersion: 1, fetchedAt, repositories }) + '\n');
await writeFile(path.join(dataDir, 'history.json'), JSON.stringify({ schemaVersion: 1, records }) + '\n');
console.log(`Đã thu thập ${repositories.length} repository; lịch sử có ${records.length} bản.`);
