# Phát bản tin lên loa Google Home bằng Home Assistant

Mục tiêu: mỗi sáng 07:00, loa **Living Room Speaker** tự phát file `briefing.mp3` (bản tin tiếng Việt) do GitHub Daily tạo.

## Luồng hoạt động

1. 06:00 (giờ Việt Nam) workflow `collect.yml` thu thập dữ liệu, rồi kích hoạt `pages.yml`.
2. `pages.yml` dựng `briefing.mp3` và `briefing.json` và triển khai lên GitHub Pages (thường mất vài phút; GitHub đôi khi chạy trễ vài chục phút).
3. 07:00 Home Assistant ra lệnh cho loa phát `https://consulducnguyen-crabit.github.io/github-daily-reporter/briefing.mp3`. Loa tự tải file qua internet; Home Assistant không phải chuyển âm thanh.

## Điều kiện

- Home Assistant đã bật tích hợp **Google Cast** (thường được tự phát hiện: Settings → Devices & services).
- Loa xuất hiện dưới dạng một thực thể `media_player`. Tên thực thể thường là `media_player.living_room_speaker`; hãy kiểm tra thật trong **Developer tools → States** (gõ `living_room`). Nếu khác, thay vào các đoạn cấu hình bên dưới.
- Mở thử URL mp3 trên trình duyệt để chắc là có file (chỉ có sau lần triển khai đầu tiên có dữ liệu thu thập).

## Bước 1 — Cảm biến đọc ngày của bản tin (để không phát bản cũ)

Thêm vào `configuration.yaml` (rồi **Developer tools → YAML → Check configuration** và khởi động lại hoặc tải lại cấu hình):

```yaml
rest:
  - resource: https://consulducnguyen-crabit.github.io/github-daily-reporter/briefing.json
    scan_interval: 3600
    sensor:
      - name: "GitHub Daily briefing generated"
        unique_id: github_daily_briefing_generated
        value_template: "{{ value_json.generatedAt }}"
```

Thực thể tạo ra sẽ là `sensor.github_daily_briefing_generated` (nếu tên khác, thay vào bước 2).

## Bước 2 — Tự động hóa phát lúc 07:00

Thêm vào `automations.yaml` (hoặc tạo bằng giao diện rồi chuyển sang chế độ YAML):

```yaml
- alias: "GitHub Daily - phát bản tin 07:00"
  id: github_daily_briefing_0700
  mode: single
  trigger:
    - platform: time
      at: "07:00:00"
  action:
    # Làm tươi cảm biến để đọc đúng bản tin mới nhất
    - service: homeassistant.update_entity
      target:
        entity_id: sensor.github_daily_briefing_generated
    - delay: "00:00:05"
    # Chỉ phát nếu bản tin là của hôm nay (giờ địa phương của Home Assistant)
    - condition: template
      value_template: >
        {% set t = states('sensor.github_daily_briefing_generated') %}
        {{ t not in ['unknown', 'unavailable', ''] and as_local(as_datetime(t)).date() == now().date() }}
    - service: media_player.volume_set
      target:
        entity_id: media_player.living_room_speaker
      data:
        volume_level: 0.4
    - service: media_player.play_media
      target:
        entity_id: media_player.living_room_speaker
      data:
        media_content_id: "https://consulducnguyen-crabit.github.io/github-daily-reporter/briefing.mp3?d={{ now().strftime('%Y%m%d') }}"
        media_content_type: "music"
```

Giải thích:
- `?d=...` thêm ngày vào địa chỉ để loa/CDN không dùng lại file cũ đã lưu tạm.
- `volume_level` từ 0 đến 1; chỉnh theo ý bạn. Lệnh này đổi âm lượng của loa và không tự đưa về mức cũ.
- Nếu loa đang phát nhạc, bản tin sẽ phát đè lên.
- Múi giờ của Home Assistant phải là `Asia/Ho_Chi_Minh` (Settings → System → General), nếu không giờ 07:00 và phép kiểm tra "hôm nay" sẽ lệch.

## Kiểm tra

1. **Developer tools → Actions** (hoặc *Services*): chạy `media_player.play_media` với thực thể loa và cùng `media_content_id` ở trên. Loa phải phát bản tin.
2. Chạy thử cả automation bằng nút **Run actions** (bỏ qua điều kiện thời gian). Nếu loa im lặng, kiểm tra bảng **Trace** của automation để xem điều kiện "hôm nay" có chặn không.

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Loa không phát, automation chạy bình thường | Sai tên thực thể; URL mp3 chưa tồn tại (chưa chạy `collect.yml` lần nào); loa không ra được internet |
| Điều kiện luôn sai | Cảm biến không đọc được `briefing.json` (404) hoặc múi giờ của Home Assistant khác `Asia/Ho_Chi_Minh` |
| Phát bản tin hôm qua | Bản tin hôm nay chưa kịp triển khai lúc 07:00; điều kiện kiểm tra ngày sẽ chặn, bạn có thể đặt thêm một trigger lúc 07:20 |
| Giọng ngắt quãng | Mạng nhà yếu; thử tải thủ công file mp3 trên cùng mạng |

## Giới hạn đã biết

- Cấu hình này chưa được chạy thử trên một Home Assistant thật trong phiên làm việc này; hãy làm theo mục *Kiểm tra* trước khi tin cậy.
- Nếu workflow thu thập hoặc triển khai lỗi, sáng hôm đó sẽ không có bản tin mới (loa im lặng, nhờ điều kiện kiểm tra ngày).
- GitHub có thể chạy lịch trễ; nếu bản tin hay chưa kịp lúc 07:00, hãy dời giờ thu thập sớm hơn trong `.github/workflows/collect.yml` (cron tính theo UTC, trừ 7 giờ so với giờ Việt Nam).
