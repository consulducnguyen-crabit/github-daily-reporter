# GitHub Daily

Dashboard tiếng Việt để khám phá repository mã nguồn mở trên GitHub. Ứng dụng tĩnh, không cần cài dependency hay token để chạy.

## Chạy ứng dụng

Phục vụ thư mục bằng máy chủ tĩnh (khuyến nghị) hoặc mở `index.html` trực tiếp:

```sh
python -m http.server 8000
```

Mở `http://localhost:8000`. Nút **Làm mới dữ liệu** gọi GitHub Search API công khai từ trình duyệt (có rate limit). Dữ liệu khởi đầu trong trang là minh họa và được gắn nhãn rõ.

Kiểm thử hàm thuần: `npm test` (Node 20 trở lên).

## Tính năng

- Tìm kiếm, lọc ngôn ngữ/giấy phép/số sao tối thiểu, sắp xếp theo sao hoặc lần cập nhật, lưu repository.
- Chi tiết repository: README tóm lược, liên kết, ghi chú cá nhân, đánh dấu đã đọc.
- Báo cáo 1/7/30 ngày: repo nhiều sao nhất và repo tăng sao nhanh nhất (chỉ khi có hai lần đo cách nhau đủ xa).
- Xuất JSON/CSV, in báo cáo, chế độ tối (theo hệ thống hoặc chọn tay).
- Bản tin âm thanh tiếng Việt dựng sẵn (`briefing.mp3`, tạo khi triển khai bằng Piper, nghe được trên mọi trình duyệt/điện thoại). Có thêm nút đọc bằng giọng vi-VN cài trên trình duyệt (dự phòng).

## Dữ liệu thu thập tự động

Workflow `.github/workflows/collect.yml` chạy lúc 07:30 giờ Việt Nam mỗi ngày, ghi `data/latest.json` và `data/history.json` (90 ngày) rồi kích hoạt triển khai Pages. Cần bật **Settings → Actions → General → Workflow permissions → Read and write**. Có thể chạy thủ công bằng *Run workflow*. Khi có dữ liệu này, trang dùng nó nếu mới hơn dữ liệu đã lưu trên trình duyệt, và tăng trưởng được tính từ lịch sử máy chủ.

Chạy thủ công cục bộ: `GITHUB_TOKEN=<token> npm run collect`.

## Bản tin âm thanh

Khi triển khai (`pages.yml`), nếu đã có `data/latest.json` thì workflow dựng lời bản tin (số đọc thành chữ), tổng hợp giọng bằng [Piper](https://github.com/OHF-Voice/piper1-gpl) với model `vi_VN-vais1000-medium` (kiểm tra SHA-256), nén thành `briefing.mp3` (~350 KB, ~1 phút) và đưa vào site. Nếu bước này lỗi, site vẫn được triển khai bình thường, chỉ không có trình phát. File âm thanh không được commit vào repo.

Ghi công: giọng tổng hợp từ model Piper `vi_VN-vais1000` huấn luyện trên bộ dữ liệu VAIS-1000, giấy phép CC BY 4.0. Lời tóm tắt chi tiết hiện chỉ có cho vài dự án mẫu; các dự án khác được đọc theo chủ đề, ngôn ngữ và số liệu.

Thử cục bộ: `node scripts/build-briefing.mjs briefing-work`, rồi `python -m piper -m <model.onnx> -i briefing-work/briefing.txt -f briefing-work/briefing.wav`.

## Quyền riêng tư và bảo mật

- Ghi chú, repo đã lưu, cache và snapshot cục bộ chỉ nằm trong localStorage của trình duyệt; xóa hoặc xuất trong Cài đặt.
- Trang có Content-Security-Policy, mọi dữ liệu từ GitHub đều được thoát ký tự, chỉ chấp nhận liên kết http(s).
- Không dùng phông hay script từ bên thứ ba.

## Giới hạn đã biết

- Danh sách là repo nhiều sao còn hoạt động trong 30 ngày (cộng repo mới tạo khi có thu thập tự động), không phải xếp hạng "xu hướng" tuyệt đối.
- Mức tăng sao chỉ hiển thị khi có hai lần đo cách nhau tối thiểu 1 giờ (thẻ) hoặc ~80% độ dài kỳ (báo cáo).
- Tóm tắt tiếng Việt chi tiết chỉ có cho vài dự án mẫu; các dự án khác được đọc theo chủ đề, ngôn ngữ và số liệu.
- Không có phát loa Google, phân tích AI hoặc tích hợp VS Code/local bridge; các phần này cần backend/thiết bị/quyền truy cập riêng (xem `plan.md`).
