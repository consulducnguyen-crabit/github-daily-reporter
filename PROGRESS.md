# Tiến độ GitHub Daily

## Đã hoàn thành (phiên bản 0.2)

### Sửa lỗi
- Nút trong dialog không còn tự đóng dialog (`type="button"`).
- Dark mode: dialog đọc được.
- Dữ liệu minh họa không còn bị trộn với kết quả "Tải thêm"; nút chỉ hiện khi nguồn là API.
- Snapshot chỉ tạo khi làm mới (không tạo khi "Tải thêm"), tối đa 1 bản/6 giờ, chỉ lưu id/sao/fork; tự cắt bớt khi localStorage đầy; migration từ `history-v2`.
- Nhãn tăng sao ghi rõ khoảng thời gian ("+N sao sau X giờ/ngày"), chỉ hiện khi hai lần đo cách ≥ 1 giờ.
- Đọc thành tiếng: dùng token phiên để bỏ qua sự kiện `canceled`/`interrupted` và sự kiện của lượt phát cũ.
- Chặn URL không phải http(s) (`javascript:`...), chống chèn công thức khi xuất CSV.
- Biểu đồ ngôn ngữ dùng danh sách đang lọc; thẻ "Lịch sử tăng trưởng" hiển thị số lần đo thật; lời chào theo giờ.

### Hiệu năng / chất lượng
- Lịch sử đọc và lập chỉ mục một lần (cache), tìm kiếm debounce, chỉ dựng lại ô lọc khi dữ liệu đổi.
- Cache README trong `sessionStorage`; phân biệt lỗi giới hạn tốc độ.
- `aria-live` chuyển sang vùng trạng thái nhỏ; bỏ handler nội tuyến; thêm CSP; bỏ Google Fonts; dark mode theo `prefers-color-scheme` khi chưa chọn.
- `app.js` viết lại dạng dễ đọc; `lib.js` + 10 test.

### Thu thập tự động
- `scripts/collect.mjs` + `collect.yml` (07:30 giờ Việt Nam): lưu `data/latest.json` và `data/history.json` (90 ngày, mỗi ngày một bản). Trang tự dùng dữ liệu này nếu mới hơn cache cục bộ; tăng trưởng 1/7/30 ngày tính từ lịch sử máy chủ.
- `pages.yml` chạy test trước khi triển khai và sao chép `data/`.

### Bản tin âm thanh tiếng Việt (Piper)
- `lib.js` có thêm `numberToVietnamese`, `briefingSentences`, `speechText` (có test); `app.js` dùng chung với script.
- `scripts/build-briefing.mjs` + bước trong `pages.yml`: tạo `briefing.mp3` và `briefing.json` từ `data/latest.json` (model `vi_VN-vais1000-medium`, CC BY 4.0, ghim SHA-256, cache `voices/`, `continue-on-error`).
- Trang có trình phát `<audio>` + ghi công; nút giọng trình duyệt giữ làm dự phòng. CSP thêm `media-src 'self'`.
- Đã thử đủ quy trình cục bộ: 6 câu, 59 giây, 356 KB; trình duyệt tải và phát được.
- Chưa kiểm chứng bằng tai: chất lượng/phát âm tên repo; cần nghe thử sau khi triển khai.

### Việt hóa giao diện và sửa lỗi sau khi triển khai thật
- Việt hóa toàn bộ nhãn giao diện (kho mã, lần đo, vấn đề đang mở, bản phát hành, tiêu đề CSV...); chủ đề có bản dịch trong `TOPICS_VI`. Mô tả dự án và README giữ tiếng Anh gốc (đã chọn, có ghi chú trên trang). `app.js` đã hỗ trợ trường `description_vi` nếu sau này có dịch.
- Sửa font bị rơi về serif sau khi bỏ Google Fonts (thêm font dự phòng cho mọi khai báo) và tương phản panel "Bản tin âm thanh" ở chế độ tối.
- Bước âm thanh trong `pages.yml` lỗi mã 127 trên runner (thiếu `ffmpeg`, bị `continue-on-error` che): đã thêm cài `ffmpeg` nếu thiếu. Cần chạy lại triển khai để xác nhận có `briefing.mp3`.

## Việc cần làm tiếp
- Chạy `collect.yml` lần đầu bằng **workflow_dispatch** sau khi đẩy code (cần Actions bật quyền ghi: Settings → Actions → Workflow permissions → Read and write). Trước đó `data/` chưa tồn tại và trang dùng API trực tiếp.
- Tóm tắt tiếng Việt chi tiết mới có cho 5 repo mẫu (quyết định: giữ mẫu hiện tại, không dùng LLM).
- Chưa làm (theo `plan.md`): phát loa Google 07:00, tích hợp VS Code/local bridge, phân tích README bằng AI.
- Chưa có test giao diện tự động; kiểm tra thủ công bằng Playwright đã chạy cho: dữ liệu thu thập, dark dialog, CSV, `javascript:` URL, CSP.

## Lưu ý
- Chưa commit/push (theo quy tắc global).
- Ghi chú đã biết: `actions/checkout@v6`, `setup-node@v4` — kiểm tra phiên bản khi workflow chạy lần đầu.
