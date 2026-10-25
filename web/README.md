# Đúng Việc — Web (Next.js)

Giao diện và backend (Route Handlers) của dự án **Đúng Việc**. Tổng quan, kiến trúc, mô-đun AI và hướng dẫn đầy đủ nằm ở [README gốc](../README.md).

## Chạy nhanh

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000
```

| Lệnh | Công dụng |
|---|---|
| `npm run dev` | Chạy chế độ phát triển |
| `npm run build` / `npm start` | Build và chạy bản production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Kiểm tra kiểu TypeScript |
| `node scripts/generate-brand-assets.mjs` | Sinh lại logo, favicon, ảnh OG (cần `sharp`) |

## Lưu ý

- Next.js 16 có thay đổi so với các phiên bản cũ (Cache Components, `instant`…) — xem [`AGENTS.md`](AGENTS.md).
- Dữ liệu lưu ở `../database/mongodb_collections.json`, tự sinh từ dữ liệu mẫu khi chưa có.
- Trang HR nằm trong `src/app/nha-tuyen-dung/`, giao diện dùng chung ở `src/components/hr/`.
