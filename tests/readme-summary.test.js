const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('README summaries preserve sources, reuse unchanged SHA and keep cached summaries on model failure', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'readme-summary-'));
  try {
    mkdirSync(path.join(root, 'scripts')); mkdirSync(path.join(root, 'data'));
    copyFileSync(path.join(__dirname, '../scripts/summarize-readmes.mjs'), path.join(root, 'scripts/summarize-readmes.mjs'));
    writeFileSync(path.join(root, 'data/latest.json'), JSON.stringify({ repositories: [{ id: 1, full_name: 'test/project' }] }));
    const mock = path.join(root, 'mock.mjs');
    writeFileSync(mock, `globalThis.fetch = async (url, options) => {
      if (url.includes('/readme')) return Response.json({ sha: process.env.README_SHA || 'abc', html_url: 'https://github.com/test/project/blob/main/README.md', content: Buffer.from('A tool for processing documents locally with a command line interface.').toString('base64') });
      if (process.env.FAIL_MODEL) return new Response('', { status: 403 });
      const body = JSON.parse(options.body);
      if (!body.messages[0].content.includes('không tin cậy')) throw new Error('missing input boundary');
      return Response.json({ choices: [{ message: { content: JSON.stringify({ summaries: [{ id: '1', summary_vi: 'Công cụ xử lý tài liệu cục bộ thông qua giao diện dòng lệnh, dành cho người cần tự động hóa.' }] }) } }] });
    };`);
    const run = extra => spawnSync(process.execPath, ['--import', mock, path.join(root, 'scripts/summarize-readmes.mjs')], {
      env: { ...process.env, GITHUB_TOKEN: 'test-token', ...extra }, encoding: 'utf8'
    });
    assert.equal(run({}).status, 0);
    const result = () => JSON.parse(readFileSync(path.join(root, 'data/readme-summaries.json'))).repositories['1'];
    assert.match(result().summary_vi, /Công cụ/);
    assert.equal(result().source_url, 'https://github.com/test/project/blob/main/README.md');
    const first = result();
    assert.equal(run({ FAIL_MODEL: '1' }).status, 0); // same SHA never needs model
    assert.deepEqual(result(), first);
    assert.equal(run({ FAIL_MODEL: '1', README_SHA: 'changed' }).status, 0);
    assert.deepEqual(result(), first); // failed translation preserves previous text and provenance
  } finally { rmSync(root, { recursive: true, force: true }); }
});
