(() => {
  'use strict';

  const { HOUR, DAY, escapeHtml, safeUrl, csvCell, buildIndex, growth, formatSpan, upsertSnapshot, briefingSentences, topicLabel } = window.GDLib;

  /* ---------- Dữ liệu khởi đầu (minh họa) ---------- */
  const demoRepositories = [
    { id: 1, full_name: 'vercel/ai', description: 'Build AI-powered applications with the AI SDK.', language: 'TypeScript', stargazers_count: 17800, forks_count: 2800, open_issues_count: 590, html_url: 'https://github.com/vercel/ai', owner: { avatar_url: 'https://avatars.githubusercontent.com/u/14985020?v=4' }, topics: ['ai', 'sdk', 'typescript'], pushed_at: '2026-10-14T12:00:00Z', license: { spdx_id: 'Apache-2.0' } },
    { id: 2, full_name: 'microsoft/markitdown', description: 'Python tool for converting files and office documents to Markdown.', language: 'Python', stargazers_count: 8100, forks_count: 420, open_issues_count: 110, html_url: 'https://github.com/microsoft/markitdown', owner: { avatar_url: 'https://avatars.githubusercontent.com/u/6154722?v=4' }, topics: ['markdown', 'document-conversion', 'python'], pushed_at: '2026-10-12T08:00:00Z', license: { spdx_id: 'MIT' } },
    { id: 3, full_name: 'immich-app/immich', description: 'High performance self-hosted photo and video management solution.', language: 'TypeScript', stargazers_count: 79000, forks_count: 4100, open_issues_count: 1800, html_url: 'https://github.com/immich-app/immich', owner: { avatar_url: 'https://avatars.githubusercontent.com/u/128344598?v=4' }, topics: ['self-hosted', 'photos', 'docker'], pushed_at: '2026-10-15T05:00:00Z', license: { spdx_id: 'AGPL-3.0' } },
    { id: 4, full_name: 'astral-sh/uv', description: 'An extremely fast Python package and project manager, written in Rust.', language: 'Rust', stargazers_count: 73000, forks_count: 2100, open_issues_count: 800, html_url: 'https://github.com/astral-sh/uv', owner: { avatar_url: 'https://avatars.githubusercontent.com/u/115962839?v=4' }, topics: ['python', 'package-manager', 'rust'], pushed_at: '2026-10-14T16:00:00Z', license: { spdx_id: 'MIT' } },
    { id: 5, full_name: 'continuedev/continue', description: 'Open-source AI code assistant for VS Code and JetBrains.', language: 'TypeScript', stargazers_count: 28000, forks_count: 3700, open_issues_count: 700, html_url: 'https://github.com/continuedev/continue', owner: { avatar_url: 'https://avatars.githubusercontent.com/u/110221055?v=4' }, topics: ['ai', 'vscode', 'developer-tools'], pushed_at: '2026-10-13T09:00:00Z', license: { spdx_id: 'Apache-2.0' } }
  ];

  const KEYS = {
    cache: 'github-daily-cache-v2',
    history: 'github-daily-history-v3',
    legacyHistory: 'github-daily-history-v2',
    saved: 'github-daily-saved',
    notes: 'github-daily-notes',
    read: 'github-daily-read',
    theme: 'github-daily-theme',
    speech: 'github-daily-speech',
    background: 'github-daily-background',
    fontScale: 'github-daily-fontscale'
  };
  const README_PREFIX = 'github-daily-readme:';
  const TZ = 'Asia/Ho_Chi_Minh';
  const PAGE_SIZE = 30;

  const $ = selector => document.querySelector(selector);
  const svgIcon = (paths, extra = '') => `<svg class="ic ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const ICON = {
    star: svgIcon('<path d="M12 3.6l2.5 5.4 5.9.7-4.3 4.1 1.1 5.8-5.2-2.9-5.2 2.9 1.1-5.8L3.6 9.7l5.9-.7z"/>', 'ic-fill'),
    fork: svgIcon('<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v1.5A3.5 3.5 0 0 0 9.5 12h5A3.5 3.5 0 0 0 18 8.5V7M12 12v5"/>'),
    issue: svgIcon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
    heart: svgIcon('<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>'),
    heartFill: svgIcon('<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>', 'ic-fill'),
    refresh: svgIcon('<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>'),
    chevron: svgIcon('<path d="M6 9l6 6 6-6"/>'),
    ext: svgIcon('<path d="M7 17L17 7M8 7h9v9"/>'),
    trend: svgIcon('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
    chart: svgIcon('<path d="M5 20V11M11 20V4M17 20v-6M3 20h18"/>'),
    check: svgIcon('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
  };
  const fmt = new Intl.NumberFormat('vi-VN');

  /* ---------- Lưu trữ cục bộ ---------- */
  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function storeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function writeStorage(key, value) {
    const ok = storeJson(key, value);
    if (!ok) showToast('Không thể lưu: bộ nhớ trình duyệt có thể đã đầy.');
    return ok;
  }

  const settings = readStorage(KEYS.speech, { rate: 0.92, voiceURI: '' });
  const cache = readStorage(KEYS.cache, null);
  const cachedRepos = Array.isArray(cache?.repositories) ? cache.repositories : null;

  const state = {
    repositories: cachedRepos?.length ? cachedRepos : demoRepositories,
    sort: 'stars',
    savedOnly: false,
    nextPage: cachedRepos ? Math.floor(cachedRepos.length / PAGE_SIZE) + 1 : 1,
    totalCount: cache?.totalCount || 0,
    live: Boolean(cachedRepos?.length),
    origin: cachedRepos?.length ? cache.origin || 'api' : 'demo', // demo | api | collector
    fetchedAt: cache?.fetchedAt || null,
    readIds: readStorage(KEYS.read, []),
    serverHistory: [],
    reading: false,
    readQueue: []
  };

  const savedIds = () => readStorage(KEYS.saved, []);
  const notes = () => readStorage(KEYS.notes, {});

  /* ---------- Lịch sử snapshot (cục bộ + máy chủ) ---------- */
  let historyCache = null;
  let unifiedCache = null;
  let indexCache = null;

  function historyRecords() {
    if (!historyCache) {
      let stored = readStorage(KEYS.history, null);
      if (!Array.isArray(stored)) stored = migrateLegacyHistory();
      historyCache = stored;
    }
    return historyCache;
  }

  function migrateLegacyHistory() {
    const old = readStorage(KEYS.legacyHistory, []);
    if (!Array.isArray(old)) return [];
    return old.slice(-120).map(record => ({
      id: record.id,
      collectedAt: record.collectedAt,
      source: record.source,
      repositories: (record.repositories || []).map(item => ({ id: item.id, stargazers_count: item.stargazers_count, forks_count: item.forks_count }))
    }));
  }

  function invalidateHistory() {
    unifiedCache = null;
    indexCache = null;
  }

  function saveHistory(records) {
    let list = records;
    let saved = false;
    // Nếu hết dung lượng thì bỏ dần nửa bản cũ nhất rồi thử lại.
    for (let attempt = 0; attempt < 4 && list.length; attempt++) {
      if (storeJson(KEYS.history, list)) {
        saved = true;
        break;
      }
      list = list.slice(Math.ceil(list.length / 2));
    }
    historyCache = list;
    invalidateHistory();
    if (!saved) showToast('Không thể lưu lịch sử các lần đo: bộ nhớ trình duyệt đã đầy.');
    else {
      try { localStorage.removeItem(KEYS.legacyHistory); } catch { /* bỏ qua */ }
    }
  }

  /** Gộp snapshot máy chủ và snapshot trình duyệt thành một danh sách thống nhất. */
  function unifiedHistory() {
    if (!unifiedCache) {
      const local = historyRecords().map(record => ({
        t: Date.parse(record.collectedAt),
        source: record.source === 'github' ? 'api' : record.source,
        count: record.repositories.length,
        stars: Object.fromEntries(record.repositories.map(item => [item.id, item.stargazers_count]))
      }));
      unifiedCache = [...state.serverHistory, ...local].filter(record => Number.isFinite(record.t)).sort((a, b) => a.t - b.t);
    }
    return unifiedCache;
  }

  function historyIndex() {
    if (!indexCache) indexCache = buildIndex(unifiedHistory());
    return indexCache;
  }

  const dataTime = () => Date.parse(state.fetchedAt) || Date.now();

  /** Mức thay đổi sao so với lần đo cũ hơn minAgeMs; null nếu chưa đủ dữ liệu. */
  function growthFor(repo, minAgeMs) {
    if (!state.live) return null;
    return growth(historyIndex().get(repo.id), repo.stargazers_count, dataTime(), minAgeMs);
  }

  /* ---------- Tiện ích hiển thị ---------- */
  function humanNumber(value) {
    const n = Number(value) || 0;
    return n >= 1000 ? `${(n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k` : fmt.format(n);
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function dateKey(date = new Date()) {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('vi-VN', { ...options, timeZone: TZ }).format(new Date(value));
  }

  function greeting() {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(new Date()));
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 14) return 'Chào buổi trưa';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  const initialsOf = name => name.split('/').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const debounce = (fn, wait = 150) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  /* ---------- Lọc & sắp xếp ---------- */
  function filteredRepos() {
    const query = $('#search').value.trim().toLowerCase();
    const language = $('#language-filter').value;
    const license = $('#license-filter').value;
    const minStars = Number($('#min-stars').value) || 0;
    const saved = savedIds();
    return state.repositories
      .filter(repo => {
        const haystack = [repo.full_name, repo.description, repo.language, ...(repo.topics || [])].join(' ').toLowerCase();
        return (!query || haystack.includes(query))
          && (!language || repo.language === language)
          && (!license || (repo.license?.spdx_id || 'NOASSERTION') === license)
          && repo.stargazers_count >= minStars
          && (!state.savedOnly || saved.includes(repo.id));
      })
      .sort((a, b) => (state.sort === 'stars' ? b.stargazers_count - a.stargazers_count : (b.pushed_at || '').localeCompare(a.pushed_at || '')));
  }

  function countBy(repos, pick) {
    const counts = {};
    repos.forEach(repo => {
      const key = pick(repo);
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  /** Dựng lại các ô chọn ngôn ngữ/giấy phép — chỉ khi danh sách repository thay đổi. */
  function renderFilterOptions() {
    const languages = countBy(state.repositories, repo => repo.language);
    const licenses = countBy(state.repositories, repo => (repo.license?.spdx_id !== 'NOASSERTION' ? repo.license?.spdx_id : null));
    const currentLanguage = $('#language-filter').value;
    const currentLicense = $('#license-filter').value;
    const option = (value, label, current) => `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    $('#language-filter').innerHTML = ['<option value="">Mọi ngôn ngữ</option>', ...Object.keys(languages).sort().map(item => option(item, item, currentLanguage))].join('');
    $('#license-filter').innerHTML = ['<option value="">Mọi giấy phép</option>', ...Object.keys(licenses).sort().map(item => option(item, item, currentLicense)), option('NOASSERTION', 'Chưa khai báo', currentLicense)].join('');
  }

  /* ---------- Hiển thị ---------- */
  function repoCard(repo, saved) {
    const isSaved = saved.includes(repo.id);
    const isRead = state.readIds.includes(repo.id);
    const avatarUrl = safeUrl(repo.owner?.avatar_url);
    const avatar = avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
    const change = growthFor(repo, HOUR);
    const changeTag = change
      ? `<span class="repo-tag">${change.delta >= 0 ? '+' : ''}${fmt.format(change.delta)} sao sau ${formatSpan(change.spanMs)}</span>`
      : '<span class="repo-tag trending">Chưa đủ dữ liệu lịch sử</span>';
    const topics = (repo.topics || []).slice(0, 3).map(topic => `<span class="repo-tag">${escapeHtml(topicLabel(topic))}</span>`).join('');
    return `<article class="repo-card"><div class="repo-avatar">${escapeHtml(initialsOf(repo.full_name))}${avatar}</div><div><a class="repo-name" href="${escapeHtml(safeUrl(repo.html_url, '#'))}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.full_name)}</a><p class="repo-desc" title="${escapeHtml(repo.description || '')}">${escapeHtml(repo.description_vi || repo.description || 'Chưa có mô tả.')}</p><div class="repo-meta"><span><i class="language-dot"></i>${escapeHtml(repo.language || 'Chưa phân loại')}</span><span>${ICON.fork}${humanNumber(repo.forks_count)} nhánh</span><span>${ICON.issue}${humanNumber(repo.open_issues_count)} vấn đề đang mở</span><span>Cập nhật ${formatDate(repo.pushed_at, { day: 'numeric', month: 'short' })}</span></div><div class="repo-tags">${topics}${changeTag}${isRead ? `<span class="repo-tag">${ICON.check} Đã đọc</span>` : ''}</div><button type="button" class="repo-detail-button" data-detail="${repo.id}">Đọc phân tích</button></div><div class="repo-side"><span class="stars">${ICON.star}${humanNumber(repo.stargazers_count)}</span><button type="button" class="save-button ${isSaved ? 'saved' : ''}" data-save="${repo.id}" aria-label="${isSaved ? 'Bỏ lưu' : 'Lưu'} ${escapeHtml(repo.full_name)}">${isSaved ? ICON.heartFill : ICON.heart}</button></div></article>`;
  }

  function sourceLabel() {
    if (!state.live) return 'Dữ liệu minh họa · Chưa kết nối API';
    const when = formatDate(state.fetchedAt, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    return state.origin === 'collector' ? `Nguồn: thu thập tự động hằng ngày · Lấy lúc ${when}` : `Nguồn: API tìm kiếm của GitHub · Lấy lúc ${when}`;
  }

  function render() {
    const repos = filteredRepos();
    const saved = savedIds();
    $('#result-count').textContent = repos.length;
    $('#filter-status').textContent = `Hiển thị ${repos.length} dự án.`;
    $('#repo-count').textContent = fmt.format(state.repositories.length);
    $('#star-count').textContent = humanNumber(state.repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0));
    const languages = countBy(state.repositories, repo => repo.language);
    $('#top-language').textContent = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    $('#repo-list').innerHTML = repos.length
      ? repos.map(repo => repoCard(repo, saved)).join('')
      : '<div class="empty-state">Không tìm thấy dự án phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.</div>';

    const shownLanguages = Object.entries(countBy(repos, repo => repo.language)).sort((a, b) => b[1] - a[1]).slice(0, 8);
    $('#language-chart').innerHTML = shownLanguages.length
      ? shownLanguages.map(([name, count]) => `<div class="language-row"><span>${escapeHtml(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.round((count / repos.length) * 100))}%"></div></div><span>${count}</span></div>`).join('')
      : '<div class="empty-state">Chưa có dữ liệu.</div>';

    $('#list-status').textContent = sourceLabel();
    $('#load-more').hidden = !(state.origin === 'api' && state.repositories.length < state.totalCount);
    renderGrowthCard();
    renderReport();
    renderHistory();
  }

  function renderGrowthCard() {
    const records = unifiedHistory();
    if (records.length < 2) {
      $('#growth-value').textContent = 'Đang thu thập';
      $('#growth-note').textContent = 'chưa đủ lần đo để so sánh';
    } else {
      $('#growth-value').textContent = `${records.length} lần đo`;
      $('#growth-note').textContent = `từ ${formatDate(records[0].t)}`;
    }
  }

  const PERIODS = {
    day: { days: 1, label: 'Hôm nay', text: 'hôm nay' },
    week: { days: 7, label: '7 ngày gần đây', text: '7 ngày' },
    month: { days: 30, label: '30 ngày gần đây', text: '30 ngày' }
  };

  function renderReport() {
    const key = $('#report-period').value;
    const period = PERIODS[key];
    const at = dataTime();
    const records = unifiedHistory();
    const inPeriod = key === 'day' ? records.filter(record => dateKey(new Date(record.t)) === dateKey(new Date(at))) : records.filter(record => at - record.t <= period.days * DAY);
    const topStars = state.repositories.slice().sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
    // Tăng trưởng chỉ tính khi có điểm đo cách ít nhất ~80% độ dài kỳ.
    const growers = state.live
      ? state.repositories
        .map(repo => ({ repo, g: growthFor(repo, period.days * DAY * 0.8) }))
        .filter(item => item.g && item.g.delta > 0)
        .sort((a, b) => b.g.delta - a.g.delta)
        .slice(0, 3)
      : [];

    $('#report-period-label').textContent = period.label;
    $('#report-copy').textContent = state.live
      ? `Bản tin dựa trên ${state.repositories.length} kho mã từ GitHub, cập nhật lúc ${formatDate(state.fetchedAt, { hour: '2-digit', minute: '2-digit' })}. Trong ${period.text} có ${inPeriod.length} lần đo được lưu. ${growers.length ? 'Mức tăng sao được tính giữa hai lần đo cách nhau đủ xa so với kỳ này.' : 'Chưa có hai lần đo cách nhau đủ xa để kết luận về tăng trưởng trong kỳ này.'}`
      : 'Đang hiển thị dữ liệu minh họa. Bấm “Làm mới dữ liệu” để tạo báo cáo từ API công khai của GitHub.';

    const first = `<div><span class="highlight-icon">${ICON.star}</span><span><b>Nhiều sao nhất: ${escapeHtml(topStars?.full_name || 'Chưa có dữ liệu')}</b><small>${topStars ? `${humanNumber(topStars.stargazers_count)} sao tại lần truy vấn gần nhất.` : 'Tải dữ liệu để xem điểm nhấn.'}</small></span></div>`;
    const second = growers.length
      ? `<div><span class="highlight-icon">${ICON.trend}</span><span><b>Tăng nhanh nhất: ${escapeHtml(growers[0].repo.full_name)}</b><small>+${fmt.format(growers[0].g.delta)} sao sau ${formatSpan(growers[0].g.spanMs)}${growers.length > 1 ? `. Tiếp theo: ${growers.slice(1).map(item => escapeHtml(item.repo.full_name)).join(', ')}.` : '.'}</small></span></div>`
      : `<div><span class="highlight-icon">${ICON.chart}</span><span><b>Đang theo dõi ${fmt.format(state.repositories.length)} dự án</b><small>${inPeriod.length ? `${inPeriod.length} lần đo trong kỳ.` : 'Lịch sử tăng trưởng sẽ xuất hiện sau các lần thu thập.'}</small></span></div>`;
    $('#report-highlights').innerHTML = first + second;
  }

  function renderHistory() {
    const records = unifiedHistory().slice().reverse().slice(0, 8);
    const label = source => (source === 'collector' ? 'Thu thập tự động' : 'API GitHub (trình duyệt này)');
    $('#history-list').innerHTML = records.length
      ? records.map(record => `<div class="history-item"><span><b>${formatDate(record.t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><small>${label(record.source)} · ${record.count} kho mã</small></span><span>${formatDate(record.t, { hour: '2-digit', minute: '2-digit' })}</span></div>`).join('')
      : '<div class="history-empty">Chưa có lịch sử. Mỗi lần tải thành công sẽ lưu một lần đo cục bộ.</div>';
  }

  /* ---------- Tải dữ liệu ---------- */
  async function fetchGitHub(reset = true) {
    if (!state.live || state.origin !== 'api') reset = true; // không trộn dữ liệu minh họa/thu thập với kết quả phân trang
    const button = $('#refresh');
    const more = $('#load-more');
    button.disabled = true;
    button.innerHTML = `${ICON.refresh} Đang lấy dữ liệu...`;
    more.disabled = true;
    try {
      const page = reset ? 1 : state.nextPage;
      const since = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
      const query = encodeURIComponent(`stars:>500 pushed:>${since} archived:false`);
      const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${PAGE_SIZE}&page=${page}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (response.status === 403 || response.status === 429) throw new Error('GitHub đang giới hạn yêu cầu. Hãy đợi một lúc rồi thử lại.');
      if (!response.ok) throw new Error(`API GitHub phản hồi lỗi ${response.status}.`);
      const data = await response.json();
      const items = data.items || [];
      state.repositories = reset ? items : [...state.repositories, ...items.filter(item => !state.repositories.some(existing => existing.id === item.id))];
      state.nextPage = page + 1;
      state.totalCount = data.total_count || 0;
      state.live = true;
      state.origin = 'api';
      state.fetchedAt = new Date().toISOString();
      writeStorage(KEYS.cache, { repositories: state.repositories, fetchedAt: state.fetchedAt, totalCount: state.totalCount, origin: 'api' });
      if (reset) saveHistory(upsertSnapshot(historyRecords(), state.repositories, Date.now(), 'github'));
      renderFilterOptions();
      render();
      showToast(`Đã tải ${items.length} kho mã từ GitHub.`);
    } catch (error) {
      showToast(error.message || 'Không thể kết nối GitHub. Kiểm tra mạng và thử lại.');
    } finally {
      button.disabled = false;
      button.innerHTML = `${ICON.refresh} Làm mới dữ liệu`;
      more.disabled = false;
    }
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  /** Nạp dữ liệu do GitHub Actions thu thập hằng ngày (nếu có), dùng nếu mới hơn cache cục bộ. */
  async function loadCollectedData() {
    const [latest, history] = await Promise.all([fetchJson('data/latest.json'), fetchJson('data/history.json')]);
    let changed = false;
    if (history && Array.isArray(history.records)) {
      state.serverHistory = history.records
        .map(record => ({ t: Date.parse(record.t), source: 'collector', count: Object.keys(record.stars || {}).length, stars: record.stars || {} }))
        .filter(record => Number.isFinite(record.t));
      invalidateHistory();
      changed = true;
    }
    if (latest && Array.isArray(latest.repositories) && latest.repositories.length && (!state.fetchedAt || Date.parse(latest.fetchedAt) > Date.parse(state.fetchedAt))) {
      state.repositories = latest.repositories;
      state.fetchedAt = latest.fetchedAt;
      state.totalCount = latest.repositories.length;
      state.live = true;
      state.origin = 'collector';
      changed = true;
    }
    if (changed) {
      renderFilterOptions();
      render();
    }
  }


  /* ---------- Bản tin âm thanh dựng sẵn (Piper, tạo khi triển khai) ---------- */
  async function loadBriefing() {
    const data = await fetchJson('briefing.json');
    if (!data || data.schemaVersion !== 1 || typeof data.audio !== 'string' || !/^[\w.-]+\.mp3$/.test(data.audio)) return;
    const generated = Date.parse(data.generatedAt);
    const ageDays = Number.isFinite(generated) ? Math.floor((Date.now() - generated) / DAY) : 0;
    $('#briefing-player').src = data.audio;
    $('#briefing-note').textContent = `Bản tin ngày ${formatDate(data.generatedAt)}${ageDays >= 3 ? ` (đã cũ ${ageDays} ngày)` : ''}. ${data.credit || ''}`;
    if (Array.isArray(data.sentences)) $('#speech-summary').textContent = data.sentences.join(' ');
    $('#briefing-box').hidden = false;
  }

  /* ---------- Lưu / đã đọc ---------- */
  function toggleSaved(id) {
    const list = savedIds();
    writeStorage(KEYS.saved, list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
    render();
  }

  function openNotice(title, message) {
    $('#dialog-title').textContent = title;
    $('#dialog-message').textContent = message;
    $('#notice-dialog').showModal();
  }

  const selectedRepo = id => state.repositories.find(repo => repo.id === Number(id));

  /* ---------- Chi tiết repository ---------- */
  function openDetail(id) {
    const repo = selectedRepo(id);
    if (!repo) return;
    const saved = savedIds().includes(repo.id);
    const read = state.readIds.includes(repo.id);
    const license = repo.license?.spdx_id || 'Không khai báo trong API';
    const repoUrl = safeUrl(repo.html_url, '#');
    const homepage = safeUrl(repo.homepage);
    const topics = (repo.topics || []).map(topic => `<span class="repo-tag">${escapeHtml(topicLabel(topic))}</span>`).join('') || '<span class="repo-tag">Chủ đề chưa khai báo</span>';
    const change = growthFor(repo, HOUR);
    const link = (href, label) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label} ${ICON.ext}</a>`;
    $('#repo-detail').innerHTML = `<div class="detail-header"><div class="repo-avatar">${escapeHtml(initialsOf(repo.full_name))}</div><div><h2>${escapeHtml(repo.full_name)}</h2><p>${escapeHtml(repo.description_vi || repo.description || 'Kho mã chưa có mô tả.')}</p></div></div><div class="detail-stats"><div class="detail-stat"><small>Sao</small><b>${ICON.star} ${humanNumber(repo.stargazers_count)}</b></div><div class="detail-stat"><small>Lượt rẽ nhánh</small><b>${humanNumber(repo.forks_count)}</b></div><div class="detail-stat"><small>Vấn đề đang mở</small><b>${humanNumber(repo.open_issues_count)}</b></div><div class="detail-stat"><small>Giấy phép</small><b>${escapeHtml(license)}</b></div></div><div class="detail-section"><h3>Thông tin quan sát được</h3><p>Ngôn ngữ chính: ${escapeHtml(repo.language || 'chưa khai báo')}. Tạo lúc ${formatDate(repo.created_at)}. Đẩy mã gần nhất ${formatDate(repo.pushed_at)}. ${change ? `Thay đổi so với lần đo cách đây ${formatSpan(change.spanMs)}: ${change.delta >= 0 ? '+' : ''}${fmt.format(change.delta)} sao.` : 'Chưa có đủ lần đo lịch sử để tính tăng trưởng.'}</p></div><div class="detail-section"><h3>Chủ đề</h3><div class="detail-topics">${topics}</div></div><div class="detail-section"><h3>Ghi chú cá nhân</h3><textarea class="detail-note" id="repo-note" placeholder="Ghi điều bạn muốn đọc hoặc kiểm tra sau...">${escapeHtml(notes()[repo.full_name] || '')}</textarea><small class="subtle">Ghi chú chỉ được lưu trong trình duyệt này.</small></div><div class="detail-links">${link(repoUrl, 'Kho mã nguồn')}${link(`${repoUrl}/releases`, 'Bản phát hành')}${link(`${repoUrl}/blob/HEAD/README.md`, 'Tài liệu README (nếu có)')}${homepage ? link(homepage, 'Trang dự án') : ''}</div><div class="detail-actions"><button type="button" id="detail-save">${saved ? 'Đã lưu' : 'Lưu đọc sau'}</button><button type="button" id="detail-read">${read ? 'Đã đánh dấu đã đọc' : 'Đánh dấu đã đọc'}</button><button type="button" id="copy-clone">Sao chép lệnh git clone</button><button type="button" id="detail-install">Cách cài an toàn</button></div><p class="subtle">Mô tả và số liệu lấy từ API của GitHub; chưa có phân tích tự động nội dung README. Hãy đọc README và kiểm tra giấy phép trước khi cài.</p>`;

    const summary = document.createElement('section');
    summary.className = 'detail-section readme-section';
    summary.innerHTML = `<h3>Giới thiệu từ tài liệu README <small class="subtle">(nguyên văn từ chủ dự án)</small></h3><div id="readme-content" data-repo="${repo.id}"><p>Đang tải nội dung nguồn từ GitHub…</p></div>`;
    $('#repo-detail .detail-section')?.after(summary);

    $('#repo-note').addEventListener('input', event => {
      const all = notes();
      all[repo.full_name] = event.target.value;
      writeStorage(KEYS.notes, all);
    });
    $('#detail-save').addEventListener('click', event => {
      toggleSaved(repo.id);
      event.currentTarget.textContent = savedIds().includes(repo.id) ? 'Đã lưu' : 'Lưu đọc sau';
    });
    $('#detail-read').addEventListener('click', event => {
      state.readIds = state.readIds.includes(repo.id) ? state.readIds.filter(item => item !== repo.id) : [...state.readIds, repo.id];
      writeStorage(KEYS.read, state.readIds);
      event.currentTarget.textContent = state.readIds.includes(repo.id) ? 'Đã đánh dấu đã đọc' : 'Đánh dấu đã đọc';
      render();
    });
    $('#copy-clone').addEventListener('click', async () => {
      const command = `git clone ${repoUrl}.git`;
      try {
        await navigator.clipboard.writeText(command);
        showToast('Đã sao chép lệnh git clone.');
      } catch {
        openNotice('Lệnh clone', command);
      }
    });
    $('#detail-install').addEventListener('click', () => openNotice('Cài đặt an toàn', `Chưa trích xuất được lệnh cài từ tài liệu. Mở README của ${repo.full_name}, kiểm tra yêu cầu và giấy phép, sau đó tự duyệt từng lệnh. GitHub Daily không thực thi lệnh.`));
    $('#repo-dialog').showModal();
    loadReadme(repo);
  }

  const readmeCache = new Map();

  function readCachedReadme(name) {
    if (readmeCache.has(name)) return readmeCache.get(name);
    try {
      return sessionStorage.getItem(README_PREFIX + name);
    } catch {
      return null;
    }
  }

  function storeReadme(name, markdown) {
    const clipped = markdown.slice(0, 12000);
    readmeCache.set(name, clipped);
    try { sessionStorage.setItem(README_PREFIX + name, clipped); } catch { /* bỏ qua */ }
    return clipped;
  }

  async function fetchReadme(repo) {
    const [owner, name] = repo.full_name.split('/');
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`, { headers: { Accept: 'application/vnd.github+json' } });
    if (response.status === 404) throw new Error('Kho mã chưa cung cấp README qua API.');
    if (response.status === 403 || response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub đã giới hạn số lần đọc README. Hãy thử lại sau ít phút.');
    if (!response.ok) throw new Error('GitHub tạm thời không trả được README.');
    const data = await response.json();
    const bytes = Uint8Array.from(atob((data.content || '').replace(/\s/g, '')), char => char.charCodeAt(0));
    return storeReadme(repo.full_name, new TextDecoder('utf-8').decode(bytes));
  }

  async function loadReadme(repo) {
    const target = $('#readme-content');
    if (!target) return;
    const stillOpen = () => $('#repo-dialog').open && $('#readme-content')?.dataset.repo === String(repo.id);
    const sourceLink = `<a class="source-link" href="${escapeHtml(safeUrl(repo.html_url, '#') + '/blob/HEAD/README.md')}" target="_blank" rel="noopener noreferrer">Mở README nguồn ${ICON.ext}</a>`;
    try {
      const markdown = readCachedReadme(repo.full_name) ?? (await fetchReadme(repo));
      if (!stillOpen()) return;
      const plain = markdown.replace(/```[\s\S]*?```/g, ' ').replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, ' ').replace(/[#>*_`~|]/g, ' ').replace(/\s+/g, ' ').trim();
      const blocks = [...markdown.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(match => match[1].trim()).filter(Boolean).slice(0, 2);
      target.innerHTML = `<p>${escapeHtml(plain.slice(0, 1600))}${plain.length > 1600 ? '…' : ''}</p>${blocks.length ? `<div class="readme-command"><small>Ví dụ được trích nguyên văn từ README — chưa xác minh, hãy đọc trước khi chạy.</small>${blocks.map(block => `<pre>${escapeHtml(block.slice(0, 700))}</pre>`).join('')}</div>` : ''}${sourceLink}`;
    } catch (error) {
      if (stillOpen()) target.innerHTML = `<p>${escapeHtml(error.message)}</p>${sourceLink}`;
    }
  }

  /* ---------- Xuất dữ liệu ---------- */
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    download(`github-daily-${dateKey()}.json`, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), timezone: TZ, source: state.live ? 'GitHub' : 'Dữ liệu minh họa', repositories: filteredRepos() }, null, 2), 'application/json;charset=utf-8');
  }

  function exportCsv() {
    const header = ['Kho mã', 'Mô tả', 'Ngôn ngữ', 'Sao', 'Lượt rẽ nhánh', 'Vấn đề đang mở', 'Giấy phép', 'Đẩy mã gần nhất', 'Liên kết'];
    const rows = filteredRepos().map(repo => [repo.full_name, repo.description || '', repo.language || '', repo.stargazers_count, repo.forks_count, repo.open_issues_count, repo.license?.spdx_id || '', repo.pushed_at || '', repo.html_url]);
    const csv = '﻿' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    download(`github-daily-${dateKey()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  /* ---------- Đọc thành tiếng ---------- */
  let speechSession = 0; // tăng mỗi khi dừng/bắt đầu để bỏ qua sự kiện của lượt phát cũ

  function setSpeechControls(active) {
    $('#speech-pause').disabled = !active;
    $('#speech-resume').disabled = !active;
    $('#speech-stop').disabled = !active;
  }

  function speechStatus(message, type = '') {
    const element = $('#speech-status');
    element.textContent = message;
    element.className = `speech-status ${type}`;
  }

  function resetSpeechUi() {
    state.readQueue = [];
    state.reading = false;
    $('#speak-button').innerHTML = 'Nghe bằng giọng trình duyệt';
    setSpeechControls(false);
  }

  function stopSpeech(message) {
    speechSession++;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    resetSpeechUi();
    if (message) speechStatus(message);
  }

  const isCancelError = event => ['canceled', 'interrupted'].includes(event?.error);
  const NO_VOICE_TITLE = 'Chưa có giọng đọc tiếng Việt';
  const NO_VOICE_MESSAGE = 'Windows chưa cung cấp giọng tiếng Việt cho trình duyệt. Nhấn Windows + Ctrl + N để mở Narrator, chọn Add more voices, thêm Vietnamese, đợi cài đặt xong rồi tải lại trang.';

  function vietnameseVoice(voices = speechSynthesis.getVoices()) {
    return voices.find(voice => voice.voiceURI === settings.voiceURI && voice.lang.toLowerCase().startsWith('vi'))
      || voices.find(voice => voice.lang.toLowerCase().startsWith('vi'))
      || null;
  }

  function loadSpeechVoices() {
    const api = window.speechSynthesis;
    const initial = api.getVoices();
    if (initial.length) return Promise.resolve(initial);
    return new Promise(resolve => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        api.removeEventListener?.('voiceschanged', changed);
        resolve(api.getVoices());
      };
      const changed = () => { if (api.getVoices().length) finish(); };
      api.addEventListener?.('voiceschanged', changed);
      setTimeout(finish, 1800);
    });
  }

  function speakNext(session) {
    if (session !== speechSession) return;
    if (!state.readQueue.length) {
      resetSpeechUi();
      speechStatus('Đã đọc xong bản tin.', 'success');
      return;
    }
    const voice = vietnameseVoice();
    if (!voice) {
      resetSpeechUi();
      speechStatus('Không có giọng tiếng Việt trên thiết bị; đã dừng để tránh đọc sai giọng.', 'error');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(state.readQueue.shift());
    utterance.lang = voice.lang || 'vi-VN';
    utterance.voice = voice;
    utterance.rate = Number(settings.rate) || 0.92;
    utterance.onstart = () => { if (session === speechSession) speechStatus(`Đang phát bằng giọng ${voice.name}.`, 'success'); };
    utterance.onend = () => speakNext(session);
    utterance.onerror = event => {
      if (session !== speechSession || isCancelError(event)) return;
      speechSession++;
      resetSpeechUi();
      speechStatus(`Trình duyệt không phát được âm thanh (${event.error || 'lỗi giọng đọc'}).`, 'error');
    };
    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      speechSession++;
      resetSpeechUi();
      speechStatus(`Không khởi động được giọng đọc: ${error.message}`, 'error');
    }
  }

  async function startSpeech() {
    if (!('speechSynthesis' in window)) {
      openNotice('Trình duyệt chưa hỗ trợ đọc thành tiếng', 'Thử phiên bản mới của Chrome, Edge hoặc Safari.');
      return;
    }
    if (state.reading || speechSynthesis.speaking) {
      stopSpeech('Đã dừng phát.');
      return;
    }
    const button = $('#speak-button');
    button.disabled = true;
    speechStatus('Đang tải giọng đọc từ trình duyệt…');
    const voices = await loadSpeechVoices();
    const voice = vietnameseVoice(voices);
    button.disabled = false;
    if (!voice) {
      resetSpeechUi();
      speechStatus('Không tìm thấy giọng vi-VN trên thiết bị.', 'error');
      openNotice(NO_VOICE_TITLE, NO_VOICE_MESSAGE);
      return;
    }
    const session = ++speechSession;
    speechSynthesis.cancel();
    speechSynthesis.resume();
    const queue = briefingSentences(state.repositories, formatDate(new Date(), { day: 'numeric', month: 'long' }), value => fmt.format(value));
    state.readQueue = queue.slice();
    $('#speech-summary').textContent = queue.join(' ');
    state.reading = true;
    button.innerHTML = 'Dừng đọc';
    setSpeechControls(true);
    speechStatus(`Đang dùng giọng tiếng Việt ${voice.name}.`, 'success');
    speakNext(session);
  }

  async function testSpeech() {
    if (!('speechSynthesis' in window)) {
      speechStatus('Trình duyệt này không hỗ trợ đọc thành tiếng.', 'error');
      return;
    }
    const button = $('#speech-test');
    button.disabled = true;
    speechStatus('Đang tải giọng đọc…');
    const voices = await loadSpeechVoices();
    const voice = vietnameseVoice(voices);
    if (!voice) {
      button.disabled = false;
      speechStatus('Không tìm thấy giọng vi-VN trên thiết bị.', 'error');
      openNotice(NO_VOICE_TITLE, NO_VOICE_MESSAGE);
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance('Xin chào. Đây là câu kiểm tra âm thanh tiếng Việt.');
    utterance.lang = voice.lang || 'vi-VN';
    utterance.voice = voice;
    utterance.rate = Number(settings.rate) || 0.92;
    utterance.onstart = () => speechStatus(`Đang thử giọng ${voice.name}.`, 'success');
    utterance.onend = () => { button.disabled = false; speechStatus('Nghe thử hoàn tất.', 'success'); };
    utterance.onerror = event => {
      button.disabled = false;
      if (isCancelError(event)) return;
      speechStatus(`Không phát được tiếng (${event.error || 'lỗi giọng đọc'}). Hãy kiểm tra âm lượng và giọng đọc Windows.`, 'error');
    };
    speechSynthesis.resume();
    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      button.disabled = false;
      speechStatus(`Không khởi động được âm thanh: ${error.message}`, 'error');
    }
  }

  /* ---------- Cài đặt ---------- */
  function fillVoiceOptions() {
    const select = $('#voice-select');
    if (!select) return;
    const voices = 'speechSynthesis' in window ? speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('vi')) : [];
    select.innerHTML = ['<option value="">Tự động chọn</option>', ...voices.map(voice => `<option value="${escapeHtml(voice.voiceURI)}" ${voice.voiceURI === settings.voiceURI ? 'selected' : ''}>${escapeHtml(voice.name)}</option>`)].join('');
    $('#voice-hint').textContent = voices.length ? 'Giọng đọc phụ thuộc vào giọng đã cài trên thiết bị.' : 'Chưa tìm thấy giọng tiếng Việt trên thiết bị này.';
  }

  function openSettings() {
    const rate = Number(settings.rate) || 0.92;
    $('#settings-content').innerHTML = `<div class="eyebrow muted">Tùy chỉnh trên trình duyệt này</div><h2>Cài đặt GitHub Daily</h2><div class="settings-grid"><section class="setting-block"><h3>Giọng đọc</h3><label>Giọng tiếng Việt <select id="voice-select"></select></label><label>Tốc độ <input id="speech-rate" type="range" min="0.7" max="1.2" step="0.05" value="${rate}"><span id="rate-value">${rate}×</span></label><p id="voice-hint"></p></section><section class="setting-block"><h3>Cỡ chữ</h3><label>Kích thước chữ <select id="font-scale">${FONT_SCALES.map(([value, label]) => `<option value="${value}" ${value === applyFontScale() ? 'selected' : ''}>${label}</option>`).join('')}</select></label><p>Áp dụng cho toàn bộ giao diện và được nhớ trên trình duyệt này.</p></section><section class="setting-block"><h3>Ảnh nền</h3><label>Hiện ảnh phòng làm việc <input id="bg-enabled" type="checkbox" ${bgSettings.enabled ? 'checked' : ''}></label><label>Tự đổi ảnh sau <select id="bg-interval">${BG_INTERVALS.map(sec => `<option value="${sec}" ${sec === bgSettings.intervalSec ? 'selected' : ''}>${sec < 60 ? `${sec} giây` : `${sec / 60} phút`}</option>`).join('')}</select></label><p>${prefersReducedMotion() ? 'Hệ thống đang bật giảm chuyển động nên ảnh nền đứng yên.' : 'Ảnh được đổi mờ dần; tạm dừng khi bạn chuyển sang tab khác.'}</p></section><section class="setting-block"><h3>Nguồn và giới hạn dữ liệu</h3><p>Dữ liệu thu thập tự động hằng ngày (nếu có) hoặc API tìm kiếm công khai của GitHub, không cần mã truy cập. Tìm kho mã có hơn 500 sao và được cập nhật trong 30 ngày; API có thể giới hạn số lần truy vấn.</p><p>Các lần đo trong trình duyệt và ghi chú chỉ được lưu trong localStorage của trình duyệt này.</p></section><section class="setting-block"><h3>Tích hợp chưa cấu hình</h3><p>Phát loa Google lúc 07:00 cần Home Assistant/Cast. Cài vào VS Code cần extension hoặc local bridge. Trang công khai không thể tự thực thi lệnh.</p></section><section class="setting-block"><h3>Tiêu chí thống kê</h3><div class="criteria-list"><div><b>Thứ tự mặc định</b><small>Sắp theo tổng sao, không gọi là xu hướng tăng.</small></div><div><b>Tăng trưởng</b><small>Chỉ so sánh các lần đo cách nhau đủ xa; nếu chưa đủ thì không kết luận.</small></div><div><b>Hoạt động</b><small>Ngày đẩy mã là tín hiệu hoạt động, không phải thước đo chất lượng.</small></div><div><b>Giấy phép</b><small>Hiển thị mã license từ metadata GitHub khi có.</small></div></div></section></div><div class="settings-actions"><button type="button" id="settings-export">Xuất dữ liệu cục bộ</button><button type="button" id="settings-clear">Xóa bộ nhớ cục bộ</button></div>`;
    fillVoiceOptions();
    $('#voice-select').addEventListener('change', event => {
      settings.voiceURI = event.target.value;
      writeStorage(KEYS.speech, settings);
    });
    $('#speech-rate').addEventListener('input', event => {
      $('#rate-value').textContent = `${event.target.value}×`;
      settings.rate = Number(event.target.value);
      writeStorage(KEYS.speech, settings);
    });
    $('#font-scale').addEventListener('change', event => {
      writeStorage(KEYS.fontScale, Number(event.target.value));
      applyFontScale();
    });
    $('#bg-enabled').addEventListener('change', event => {
      bgSettings.enabled = event.target.checked;
      writeStorage(KEYS.background, bgSettings);
      applyBackground();
    });
    $('#bg-interval').addEventListener('change', event => {
      bgSettings.intervalSec = Number(event.target.value);
      writeStorage(KEYS.background, bgSettings);
      startBackgroundTimer();
    });
    $('#settings-export').addEventListener('click', () => download(`github-daily-local-${dateKey()}.json`, JSON.stringify({ repositories: state.repositories, history: historyRecords(), saved: savedIds(), notes: notes() }, null, 2), 'application/json;charset=utf-8'));
    $('#settings-clear').addEventListener('click', () => {
      if (!confirm('Xóa dữ liệu GitHub Daily đã lưu trên trình duyệt này?')) return;
      Object.values(KEYS).forEach(key => { try { localStorage.removeItem(key); } catch { /* bỏ qua */ } });
      try { sessionStorage.clear(); } catch { /* bỏ qua */ }
      location.reload();
    });
    $('#settings-dialog').showModal();
  }

  /* ---------- Ảnh nền phòng làm việc (tự đổi theo chu kỳ) ---------- */
  const BG_INTERVALS = [30, 60, 300];
  const bgSettings = (() => {
    const stored = readStorage(KEYS.background, {});
    return { enabled: stored.enabled !== false, intervalSec: BG_INTERVALS.includes(stored.intervalSec) ? stored.intervalSec : 60 };
  })();
  const bg = { images: [], order: [], position: -1, timer: null, front: 'bg-a', token: 0 };

  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  function shuffled(count, avoidFirst) {
    const list = Array.from({ length: count }, (_, i) => i);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (count > 1 && list[0] === avoidFirst) list.push(list.shift());
    return list;
  }

  function nextBackgroundIndex() {
    bg.position++;
    if (bg.position >= bg.order.length) {
      bg.order = shuffled(bg.images.length, bg.order[bg.order.length - 1]);
      bg.position = 0;
    }
    return bg.order[bg.position];
  }

  function showBackground() {
    if (!bg.images.length || !bgSettings.enabled) return;
    const image = bg.images[nextBackgroundIndex()];
    const token = ++bg.token;
    const probe = new Image();
    probe.onload = () => {
      if (token !== bg.token || !bgSettings.enabled) return;
      const back = bg.front === 'bg-a' ? 'bg-b' : 'bg-a';
      $(`#${back}`).style.backgroundImage = `url("assets/bg/${image.file}")`;
      $(`#${back}`).classList.add('show');
      $(`#${bg.front}`).classList.remove('show');
      bg.front = back;
      renderBackgroundCredit(image);
    };
    probe.onerror = () => { if (token === bg.token) showBackground(); };
    probe.src = `assets/bg/${image.file}`;
  }

  function renderBackgroundCredit(image) {
    const credit = $('#bg-credit');
    credit.textContent = '';
    if (!image) return;
    const link = document.createElement('a');
    link.href = safeUrl(image.source, '#');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = image.title;
    credit.append('Ảnh nền: ', link, ` · ${image.author} · ${image.license}`);
  }

  function stopBackgroundTimer() {
    clearInterval(bg.timer);
    bg.timer = null;
  }

  function startBackgroundTimer() {
    stopBackgroundTimer();
    // Người dùng ưu tiên giảm chuyển động: chỉ hiện một ảnh cố định, không tự đổi.
    if (!bgSettings.enabled || prefersReducedMotion() || bg.images.length < 2 || document.hidden) return;
    bg.timer = setInterval(showBackground, bgSettings.intervalSec * 1000);
  }

  function applyBackground() {
    document.body.classList.toggle('no-bg', !bgSettings.enabled);
    bg.token++;
    if (!bgSettings.enabled) {
      stopBackgroundTimer();
      renderBackgroundCredit(null);
      ['bg-a', 'bg-b'].forEach(id => { $(`#${id}`).classList.remove('show'); $(`#${id}`).style.backgroundImage = ''; });
      return;
    }
    if (!bg.images.length) return;
    showBackground();
    startBackgroundTimer();
  }

  async function initBackground() {
    const data = await fetchJson('assets/bg/backgrounds.json');
    if (!data || !Array.isArray(data.images)) return;
    bg.images = data.images.filter(item => item && /^[\w.-]+\.webp$/.test(item.file) && typeof item.title === 'string');
    if (!bg.images.length) return;
    document.addEventListener('visibilitychange', () => (document.hidden ? stopBackgroundTimer() : startBackgroundTimer()));
    applyBackground();
  }

  /* ---------- Cỡ chữ ---------- */
  const FONT_SCALES = [[1, 'Nhỏ (gốc)'], [1.15, 'Vừa (mặc định)'], [1.3, 'Lớn'], [1.45, 'Rất lớn']];

  function applyFontScale() {
    const stored = Number(readStorage(KEYS.fontScale, 1.15));
    const scale = FONT_SCALES.some(([value]) => value === stored) ? stored : 1.15;
    document.documentElement.style.setProperty('--fs', String(scale));
    return scale;
  }

  /* ---------- Nút cuộn trang ---------- */
  function initScrollButtons() {
    const up = $('#scroll-up');
    const down = $('#scroll-down');
    let queued = false;
    const update = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      up.hidden = window.scrollY < 300;
      down.hidden = max < 600 || max - window.scrollY < 300;
    };
    const schedule = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    const scrollTo = top => window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    up.addEventListener('click', () => scrollTo(0));
    down.addEventListener('click', () => scrollTo(document.documentElement.scrollHeight));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    update();
  }

  /* ---------- Khởi tạo ---------- */
  function setSortLabel(button) {
    button.innerHTML = `Sắp xếp: ${state.sort === 'stars' ? 'Nhiều sao nhất' : 'Cập nhật gần đây'} ${ICON.chevron}`;
  }

  function applyTheme() {
    const stored = readStorage(KEYS.theme, null);
    const dark = stored ? stored === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', Boolean(dark));
  }

  function bindEvents() {
    $('#refresh').addEventListener('click', () => fetchGitHub(true));
    $('#load-more').addEventListener('click', () => fetchGitHub(false));
    const rerender = debounce(render);
    $('#search').addEventListener('input', rerender);
    $('#min-stars').addEventListener('input', rerender);
    $('#language-filter').addEventListener('change', render);
    $('#license-filter').addEventListener('change', render);
    $('#saved-filter').addEventListener('click', event => {
      state.savedOnly = !state.savedOnly;
      event.currentTarget.setAttribute('aria-pressed', String(state.savedOnly));
      render();
    });
    $('#clear-filters').addEventListener('click', () => {
      $('#search').value = '';
      $('#language-filter').value = '';
      $('#license-filter').value = '';
      $('#min-stars').value = '';
      state.savedOnly = false;
      $('#saved-filter').setAttribute('aria-pressed', 'false');
      render();
    });
    $('#sort-button').addEventListener('click', event => {
      state.sort = state.sort === 'stars' ? 'recent' : 'stars';
      setSortLabel(event.currentTarget);
      render();
    });
    $('#report-period').addEventListener('change', renderReport);
    $('#repo-list').addEventListener('click', event => {
      const detail = event.target.closest('[data-detail]');
      const save = event.target.closest('[data-save]');
      if (detail) openDetail(detail.dataset.detail);
      if (save) toggleSaved(Number(save.dataset.save));
    });
    // Ảnh đại diện lỗi thì gỡ đi, chữ viết tắt phía sau sẽ hiện ra (không dùng handler nội tuyến để tương thích CSP).
    document.addEventListener('error', event => {
      if (event.target.tagName === 'IMG' && event.target.closest('.repo-avatar')) event.target.remove();
    }, true);
    $('#theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('dark');
      writeStorage(KEYS.theme, document.body.classList.contains('dark') ? 'dark' : 'light');
    });
    $('#speak-button').addEventListener('click', startSpeech);
    $('#speech-test').addEventListener('click', testSpeech);
    $('#speech-pause').addEventListener('click', () => {
      speechSynthesis.pause();
      $('#speech-pause').disabled = true;
      $('#speech-resume').disabled = false;
      speechStatus('Đã tạm dừng.', 'success');
    });
    $('#speech-resume').addEventListener('click', () => {
      speechSynthesis.resume();
      $('#speech-pause').disabled = false;
      $('#speech-resume').disabled = true;
      speechStatus('Đang tiếp tục phát.', 'success');
    });
    $('#speech-stop').addEventListener('click', () => stopSpeech('Đã dừng phát.'));
    if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { if ($('#settings-dialog').open) fillVoiceOptions(); });
    $('#install-info').addEventListener('click', () => openNotice('Cài đặt dự án an toàn', 'Mở kho mã gốc, đọc README và kiểm tra giấy phép trước khi chạy lệnh. Phiên bản này không thực thi lệnh, cài phần mềm hoặc kết nối VS Code tự động.'));
    $('#settings-open').addEventListener('click', openSettings);
    $('#export-json').addEventListener('click', exportJson);
    $('#export-csv').addEventListener('click', exportCsv);
    $('#print-report').addEventListener('click', () => window.print());
    $('#clear-history').addEventListener('click', () => {
      if (!confirm('Xóa lịch sử các lần đo trên trình duyệt này?')) return;
      saveHistory([]);
      render();
    });
    $('#history-link').addEventListener('click', () => setTimeout(() => $('#history').scrollIntoView({ behavior: 'smooth' }), 0));
  }

  $('#today').textContent = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(new Date());
  $('#greeting').textContent = greeting();
  applyFontScale();
  applyTheme();
  bindEvents();
  initScrollButtons();
  renderFilterOptions();
  render();
  loadCollectedData();
  loadBriefing();
  initBackground();
})();
