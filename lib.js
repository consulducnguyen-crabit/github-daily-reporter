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


  /* ---------- Bản tin tiếng Việt ---------- */
  const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readTriple(n, full) {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    const parts = [];
    if (h > 0 || full) parts.push(`${DIGITS[h]} trăm`);
    if (t === 0) {
      if (u > 0) parts.push((h > 0 || full ? 'linh ' : '') + DIGITS[u]);
    } else if (t === 1) {
      parts.push('mười' + (u === 0 ? '' : ` ${u === 5 ? 'lăm' : DIGITS[u]}`));
    } else {
      parts.push(`${DIGITS[t]} mươi` + (u === 0 ? '' : ` ${u === 1 ? 'mốt' : u === 5 ? 'lăm' : DIGITS[u]}`));
    }
    return parts.join(' ');
  }

  /** Đọc số nguyên không âm thành chữ tiếng Việt (tới hàng trăm tỷ); ngoài phạm vi thì trả lại chuỗi số. */
  function numberToVietnamese(value) {
    let n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 0) return String(value);
    if (n === 0) return DIGITS[0];
    const units = ['', 'nghìn', 'triệu', 'tỷ'];
    const groups = [];
    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    if (groups.length > units.length) return String(value);
    const parts = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      parts.push(readTriple(groups[i], parts.length > 0) + (units[i] ? ` ${units[i]}` : ''));
    }
    return parts.join(' ');
  }

  const KNOWN_SUMMARIES = {
    'vercel/ai': 'Bộ công cụ giúp lập trình viên xây dựng ứng dụng tích hợp trí tuệ nhân tạo.',
    'microsoft/markitdown': 'Công cụ chuyển đổi tài liệu và tệp văn phòng sang định dạng Markdown.',
    'immich-app/immich': 'Giải pháp tự lưu trữ để quản lý ảnh và video cá nhân.',
    'astral-sh/uv': 'Công cụ quản lý dự án và thư viện Python tốc độ cao.',
    'continuedev/continue': 'Trợ lý lập trình mã nguồn mở tích hợp với Visual Studio Code và JetBrains.'
  };

  const TOPICS_VI = { ai: 'trí tuệ nhân tạo', sdk: 'bộ công cụ phát triển', typescript: 'TypeScript', python: 'Python', rust: 'Rust', self_hosted: 'tự lưu trữ', photos: 'quản lý ảnh', photo_management: 'quản lý ảnh', docker: 'Docker', markdown: 'tài liệu Markdown', document_conversion: 'chuyển đổi tài liệu', package_manager: 'quản lý gói phần mềm', vscode: 'Visual Studio Code', developer_tools: 'công cụ dành cho lập trình viên', web: 'ứng dụng web', api: 'giao diện lập trình', database: 'cơ sở dữ liệu', security: 'bảo mật', automation: 'tự động hóa', machine_learning: 'học máy', open_source: 'mã nguồn mở' };

  /** Nhãn chủ đề tiếng Việt nếu đã biết, ngược lại giữ nguyên bản. */
  function topicLabel(topic) {
    return TOPICS_VI[String(topic).toLowerCase().replaceAll('-', '_')] || topic;
  }

  function vietnameseSummary(repo, index, formatNumber = String) {
    const topics = (repo.topics || []).map(topic => TOPICS_VI[topic.toLowerCase().replaceAll('-', '_')]).filter(Boolean).slice(0, 2);
    const language = repo.language ? ` Ngôn ngữ chính là ${repo.language}.` : '';
    const summary = KNOWN_SUMMARIES[repo.full_name] || (topics.length ? `Dự án có chủ đề ${topics.join(' và ')}.` : 'GitHub chưa cung cấp đủ thông tin tiếng Việt để mô tả chức năng cụ thể.');
    return `Dự án thứ ${formatNumber(index + 1)}, ${repo.full_name}. ${summary}${language} Hiện có ${formatNumber(repo.stargazers_count)} lượt sao và ${formatNumber(repo.forks_count)} lượt rẽ nhánh.`;
  }

  /** Các câu của bản tin: câu giới thiệu + 5 dự án nhiều sao nhất. */
  function briefingSentences(repositories, dateLabel, formatNumber = String) {
    const top = repositories.slice().sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
    return [
      `Bản tin GitHub Daily ngày ${dateLabel}. Có ${formatNumber(repositories.length)} dự án trong danh sách.`,
      ...top.map((repo, index) => vietnameseSummary(repo, index, formatNumber))
    ];
  }

  /** Chuẩn hóa chuỗi cho bộ tổng hợp giọng: tên repo/ngôn ngữ có ký hiệu mà giọng đọc sẽ đọc sai. */
  function speechText(text) {
    return text
      .replace(/C\+\+/g, 'C cộng cộng')
      .replace(/C#/g, 'C thăng')
      .replace(/[\/_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { HOUR, DAY, escapeHtml, safeUrl, csvCell, buildIndex, growth, formatSpan, upsertSnapshot, mergeServerHistory, numberToVietnamese, vietnameseSummary, briefingSentences, speechText, topicLabel };
});
