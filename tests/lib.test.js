const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../lib.js');

const { HOUR, DAY } = lib;

test('escapeHtml thoát ký tự nguy hiểm', () => {
  assert.equal(lib.escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(lib.escapeHtml(undefined), '');
});

test('safeUrl chỉ cho phép http(s)', () => {
  assert.equal(lib.safeUrl('https://github.com/a/b'), 'https://github.com/a/b');
  assert.equal(lib.safeUrl('javascript:alert(1)'), '');
  assert.equal(lib.safeUrl('data:text/html,x', '#'), '#');
  assert.equal(lib.safeUrl('không phải url', '#'), '#');
  assert.equal(lib.safeUrl(null), '');
});

test('csvCell chặn công thức nhưng giữ số', () => {
  assert.equal(lib.csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(lib.csvCell('+1'), `"'+1"`);
  assert.equal(lib.csvCell('@a'), `"'@a"`);
  assert.equal(lib.csvCell(-5), '"-5"');
  assert.equal(lib.csvCell('bình thường'), '"bình thường"');
  assert.equal(lib.csvCell(null), '""');
});

test('buildIndex gộp và sắp theo thời gian', () => {
  const index = lib.buildIndex([{ t: 2000, stars: { 1: 20 } }, { t: 1000, stars: { 1: 10, 2: 5 } }]);
  assert.deepEqual(index.get(1), [{ t: 1000, stars: 10 }, { t: 2000, stars: 20 }]);
  assert.equal(index.get(2).length, 1);
});

test('growth trả null khi chưa đủ khoảng cách', () => {
  const at = 10 * DAY;
  const series = [{ t: at - 30 * 60000, stars: 100 }];
  assert.equal(lib.growth(series, 110, at, HOUR), null);
  assert.equal(lib.growth(undefined, 110, at, HOUR), null);
});

test('growth lấy điểm gần nhất cũ hơn ngưỡng', () => {
  const at = 10 * DAY;
  const series = [
    { t: at - 8 * DAY, stars: 50 },
    { t: at - 2 * DAY, stars: 80 },
    { t: at - 2 * HOUR, stars: 98 }
  ];
  assert.equal(lib.growth(series, 100, at, 1 * HOUR).delta, 2);
  assert.equal(lib.growth(series, 100, at, 5.6 * DAY).delta, 50);
  assert.equal(lib.growth(series, 100, at, 5.6 * DAY).spanMs, 8 * DAY);
});

test('formatSpan', () => {
  assert.equal(lib.formatSpan(3 * HOUR), '3 giờ');
  assert.equal(lib.formatSpan(10 * 60000), '1 giờ');
  assert.equal(lib.formatSpan(72 * HOUR), '3 ngày');
});

test('upsertSnapshot thay bản quá gần, thêm bản đủ xa, loại bản cũ', () => {
  const repos = [{ id: 1, stargazers_count: 10, forks_count: 2, description: 'bỏ', html_url: 'bỏ' }];
  const now = Date.parse('2026-10-16T00:00:00Z');
  let records = lib.upsertSnapshot([], repos, now, 'github');
  assert.equal(records.length, 1);
  assert.deepEqual(Object.keys(records[0].repositories[0]).sort(), ['forks_count', 'id', 'stargazers_count']);
  records = lib.upsertSnapshot(records, repos, now + HOUR, 'github');
  assert.equal(records.length, 1, 'cách <6 giờ thì thay thế');
  records = lib.upsertSnapshot(records, repos, now + 7 * HOUR, 'github');
  assert.equal(records.length, 2);
  records = lib.upsertSnapshot(records, repos, now + 100 * DAY, 'github');
  assert.equal(records.length, 1, 'bản >90 ngày bị loại');
});

test('upsertSnapshot giới hạn 120 bản', () => {
  let records = [];
  const start = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < 200; i++) records = lib.upsertSnapshot(records, [], start + i * 7 * HOUR, 'github');
  assert.ok(records.length <= 120);
});

test('mergeServerHistory mỗi ngày một bản và giữ 90 ngày', () => {
  const old = [
    { t: '2026-06-01T00:30:00.000Z', stars: { 1: 1 } },
    { t: '2026-10-15T00:30:00.000Z', stars: { 1: 5 } },
    { t: '2026-10-16T00:10:00.000Z', stars: { 1: 6 } }
  ];
  const merged = lib.mergeServerHistory(old, '2026-10-16T00:30:00.000Z', { 1: 7 });
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[1].stars, { 1: 7 });
});
