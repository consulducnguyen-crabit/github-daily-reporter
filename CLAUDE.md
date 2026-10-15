# GitHub Daily — hướng dẫn cho Claude Code

Dashboard tiếng Việt khám phá repository mã nguồn mở trên GitHub. Ứng dụng tĩnh (không build, không dependency runtime), triển khai bằng GitHub Pages.

## Cấu trúc

- `index.html`, `styles.css`, `app.js` — giao diện và logic trình duyệt (một IIFE, script cổ điển; không dùng ES module để vẫn mở được bằng `file://`).
- `lib.js` — hàm thuần dùng chung (UMD): `escapeHtml`, `safeUrl`, `csvCell`, `buildIndex`, `growth`, `upsertSnapshot`, `mergeServerHistory`. Trình duyệt dùng `window.GDLib`; Node dùng `require`.
- `scripts/build-briefing.mjs` — dựng lời bản tin (`briefing.txt`/`briefing.json`) cho bước tạo âm thanh Piper trong `pages.yml`; `briefing.mp3` chỉ có trong site đã triển khai, không commit.
- `scripts/collect.mjs` — thu thập dữ liệu hằng ngày -> `data/latest.json`, `data/history.json` (do workflow `collect.yml` chạy, không sửa tay).
- `tests/lib.test.js` — test cho `lib.js` (`npm test`).
- `.github/workflows/` — `pages.yml` (test + triển khai), `collect.yml` (cron 00:30 UTC, commit dữ liệu, kích hoạt `pages.yml`).
- `plan.md` — kế hoạch dài hạn; `README.md` — mô tả người dùng; `PROGRESS.md` — tiến độ.

## Quy ước

- Giao diện và tài liệu viết tiếng Việt có dấu; giờ hiển thị theo `Asia/Ho_Chi_Minh`.
- Mọi dữ liệu từ GitHub là không tin cậy: luôn `escapeHtml` khi đưa vào `innerHTML`, `safeUrl` cho mọi `href`/`src`, `csvCell` khi xuất CSV.
- Không dùng handler nội tuyến (`onclick=`, `onerror=`) — trang có CSP (`script-src 'self'`). Nút trong `<dialog><form>` phải có `type="button"`.
- Không gán nhãn tăng trưởng nếu chưa có hai lần đo cách nhau đủ xa (`growth()` trả `null`).
- Thay đổi định dạng localStorage phải nâng hậu tố khóa (ví dụ `history-v3`) và có migration.
- Hàm thuần mới đặt vào `lib.js` kèm test.

## Chạy và kiểm thử

- Chạy: `python -m http.server 8000` rồi mở `http://localhost:8000`.
- Test: `npm test` (Node >= 20).
- Thu thập thủ công: `GITHUB_TOKEN=... npm run collect` (ghi vào `data/`).

## Quy trình làm việc (theo cấu hình global)

- Đọc `CLAUDE.md`, `PROGRESS.md` trước khi sửa. Thư mục `graphify-out/` hiện chưa có; nếu được tạo thì đọc `GRAPH_REPORT.md`.
- Phân tích, phản biện, đề xuất phương án và chờ duyệt trước khi sửa code; sau khi sửa phải tự kiểm tra logic, data flow, bảo mật.
- **Không tự `git commit` / `git push`**; chỉ làm khi người dùng đồng ý rõ ràng.
- Giao tiếp với người dùng hoàn toàn bằng tiếng Việt.
