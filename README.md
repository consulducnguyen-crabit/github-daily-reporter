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
- Đọc tóm tắt qua Web Speech API của trình duyệt.
- Giao diện responsive, chế độ tối và ngày giờ theo múi giờ Việt Nam.
- Không dùng token, AI trả phí hay backend.

## Giới hạn đã biết

- Tăng sao 24 giờ/7 ngày/30 ngày không được hiển thị trước khi có snapshot định kỳ. Tổng sao trong giao diện là tổng hiện có từ danh sách và chỉ đúng tại lần truy vấn.
- Danh sách đầu tiên là dữ liệu minh họa. GitHub API có thể giới hạn yêu cầu chưa xác thực.
- Không có lịch chạy nền, lưu lịch sử báo cáo, phát loa Google, phân tích AI hoặc tích hợp VS Code/local bridge. Các phần này cần backend/thiết bị/quyền truy cập riêng.
- TTS phụ thuộc giọng tiếng Việt do hệ điều hành và trình duyệt cung cấp.

## Triển khai

Có thể xuất bản thư mục này lên dịch vụ hosting tĩnh. Nếu triển khai GitHub Pages, cần cấu hình Pages ở phần cài đặt repository. Chưa có workflow tự động vì repo ban đầu chưa có thông tin nhánh phát hành hoặc quyền Actions phù hợp.
