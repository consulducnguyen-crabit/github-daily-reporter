/* Hàm thuần dùng chung cho trình duyệt (window.GDLib), Node test và script thu thập dữ liệu. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GDLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const HOUR = 3600000;
  const DAY = 86400000;
  const RETENTION_DAYS = 90;
  const LOCAL_SNAPSHOT_GAP = 6 * HOUR;
  const LOCAL_MAX_RECORDS = 120;

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
  }

  /** Chỉ cho phép http(s); mọi scheme khác (javascript:, data:...) trả về fallback. */
  function safeUrl(value, fallback = '') {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : fallback;
    } catch {
      return fallback;
    }
  }

  /** Ô CSV an toàn: chặn công thức (=,+,-,@) trong chuỗi từ nguồn không tin cậy. */
  function csvCell(value) {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  /** records: [{t:number(ms), stars:{[id]:number}}] -> Map id -> [{t, stars}] sắp theo thời gian. */
  function buildIndex(records) {
    const index = new Map();
    for (const record of records) {
      if (!Number.isFinite(record.t)) continue;
      for (const [id, stars] of Object.entries(record.stars || {})) {
        const key = Number(id);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ t: record.t, stars: Number(stars) });
      }
    }
    for (const series of index.values()) series.sort((a, b) => a.t - b.t);
    return index;
  }

  /**
   * Mức thay đổi sao so với điểm đo gần nhất cũ hơn minAgeMs (tính từ thời điểm `at` của dữ liệu).
   * Trả về null nếu chưa có điểm đo nào đủ xa — không suy đoán.
   */
  function growth(series, current, at, minAgeMs) {
    if (!series || !series.length) return null;
    const limit = at - minAgeMs;
    let base = null;
    for (const point of series) {
      if (point.t <= limit && (!base || point.t > base.t)) base = point;
    }
    if (!base) return null;
    return { delta: current - base.stars, spanMs: at - base.t, from: base.t };
  }

  function formatSpan(ms) {
    return ms < 48 * HOUR ? `${Math.max(1, Math.round(ms / HOUR))} giờ` : `${Math.round(ms / DAY)} ngày`;
  }

  /**
   * Thêm/cập nhật snapshot cục bộ: tối đa 1 bản mỗi 6 giờ (bản mới thay bản cũ nếu quá gần),
   * giữ 90 ngày, tối đa 120 bản, chỉ lưu id/sao/fork để tiết kiệm localStorage.
   */
  function upsertSnapshot(records, repositories, nowMs, source) {
    const kept = records.filter(record => nowMs - Date.parse(record.collectedAt) <= RETENTION_DAYS * DAY);
    const entry = {
      id: String(nowMs),
      collectedAt: new Date(nowMs).toISOString(),
      source,
      repositories: repositories.map(repo => ({
        id: repo.id,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count
      }))
    };
    const last = kept[kept.length - 1];
    if (last && last.source === source && nowMs - Date.parse(last.collectedAt) < LOCAL_SNAPSHOT_GAP) kept[kept.length - 1] = entry;
    else kept.push(entry);
    return kept.slice(-LOCAL_MAX_RECORDS);
  }

  /** Lịch sử phía máy chủ: mỗi ngày (UTC) một bản, giữ 90 ngày. */
  function mergeServerHistory(records, nowIso, stars) {
    const nowMs = Date.parse(nowIso);
    const day = nowIso.slice(0, 10);
    const kept = records.filter(record => nowMs - Date.parse(record.t) <= RETENTION_DAYS * DAY && record.t.slice(0, 10) !== day);
    kept.push({ t: nowIso, stars });
    return kept.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  }

  return { HOUR, DAY, escapeHtml, safeUrl, csvCell, buildIndex, growth, formatSpan, upsertSnapshot, mergeServerHistory };
});
