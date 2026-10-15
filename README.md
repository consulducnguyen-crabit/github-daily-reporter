# GitHub Daily

Dashboard tiếng Việt để khám phá repository mã nguồn mở trên GitHub. Phiên bản đầu là ứng dụng tĩnh, không cần cài dependency hay cấu hình token.

## Chạy ứng dụng

Mở `index.html` trong trình duyệt. Để tính năng tải dữ liệu hoạt động ổn định, phục vụ thư mục này bằng máy chủ tĩnh, ví dụ:

```sh
python -m http.server 8000
```

Sau đó mở `http://localhost:8000`. Nút **Làm mới dữ liệu** gọi GitHub Search API công khai từ trình duyệt. API công khai có rate limit; dữ liệu khởi đầu trong trang được gắn nhãn minh họa và không phải số liệu hiện thời.

## MVP hiện có

- Tìm kiếm, lọc ngôn ngữ, sắp xếp, lưu repository trên trình duyệt.
- Tải repository công khai từ GitHub Search API, mở nguồn GitHub trực tiếp.
- Bộ lọc theo ngôn ngữ, giấy phép, số sao tối thiểu; sắp xếp theo sao hoặc lần cập nhật.
- Chi tiết repository, liên kết README/releases, ghi chú cá nhân và đánh dấu đã đọc.
- Snapshot/lịch sử quan sát, báo cáo 1/7/30 ngày, xuất JSON/CSV và in.
- Đọc tóm tắt qua Web Speech API của trình duyệt.
- Cài đặt giọng đọc, chế độ tối và ngày giờ theo múi giờ Việt Nam.
- Dữ liệu repository gần nhất, ghi chú và lịch sử được lưu cục bộ trên trình duyệt; xóa hoặc xuất từ Cài đặt.
- Không dùng token, AI trả phí hay backend.

## Giới hạn đã biết

- Snapshot được thu thập khi người dùng chủ động tải dữ liệu và chỉ tồn tại trên trình duyệt đó. Báo cáo ngày/tuần/tháng không đại diện cho dữ liệu máy chủ hay lịch thu thập tự động.
- Mức chênh sao trên thẻ chỉ so sánh lần đo gần nhất với lần đo trước; không gán nhãn tăng 24 giờ/7 ngày/30 ngày nếu khoảng cách giữa các lần đo không đáp ứng kỳ đó.
- Danh sách đầu tiên là dữ liệu minh họa. GitHub API có thể giới hạn yêu cầu chưa xác thực.
- Không có lịch chạy nền, phát loa Google, phân tích AI hoặc tích hợp VS Code/local bridge. Các phần này cần backend/thiết bị/quyền truy cập riêng.
- TTS phụ thuộc giọng tiếng Việt do hệ điều hành và trình duyệt cung cấp.

## Triển khai

Có thể xuất bản thư mục này lên dịch vụ hosting tĩnh. Nếu triển khai GitHub Pages, cần cấu hình Pages ở phần cài đặt repository. Chưa có workflow tự động vì repo ban đầu chưa có thông tin nhánh phát hành hoặc quyền Actions phù hợp.
