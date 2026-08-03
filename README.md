# Backend — BE Booking Sport

API NestJS cho hệ thống đặt sân thể thao: auth, cơ sở/sân, booking, thanh toán VNPay, chat realtime, thông báo, tìm kiếm.

|                   |                                                                         |
| ----------------- | ----------------------------------------------------------------------- |
| **Repo**          | [Minhdwc/BE-booking-sport](https://github.com/Minhdwc/BE-booking-sport) |
| **Base path**     | `/api/v1`                                                               |
| **Port mặc định** | `3001`                                                                  |

## Tech stack

- **NestJS 10** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Redis** + **BullMQ** (queue, cache)
- **Socket.io** (chat, notifications)
- **JWT** (access + refresh token)
- **AWS S3 / CloudFront** (upload ảnh)
- **VNPay** (cổng thanh toán)
- **Nodemailer** (email xác thực)
- **Elasticsearch** (tìm kiếm — tùy chọn)

## Yêu cầu

- Node.js 20+
- Docker (khuyến nghị cho PostgreSQL & Redis local)

## Quick start

```bash
# 1. Khởi động PostgreSQL + Redis
docker compose up -d
# 2. Cài dependency & sync schema
npm install
# Tạo file .env (xem mục Biến môi trường bên dưới)
npx prisma db push
# 3. Chạy API
npm run start:dev
```

Health check: `GET http://localhost:3001/api/v1/health`

## Biến môi trường

Tạo file `.env` (không commit file này):

```env
# Server
NODE_ENV=development
PORT=3001
TZ=Asia/Ho_Chi_Minh

# Database
DATABASE_URL=your-database-url

# JWT
ACCESS_TOKEN_SECRET=your-access-secret
ACCESS_TOKEN_LIFE=1h
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_LIFE=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS & Frontend
FRONTEND_URL=your-frontend-url
CORS_ORIGINS=list-url-of-you
MOBILE_PAYMENT_RETURN_URL=your-url-mobile-payment

# Email (SMTP)
MAIL_HOST=your-server-mail-host
MAIL_PORT=your-port-available
MAIL_USER=
MAIL_PASS=

# AWS S3
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secrey-access-key
AWS_S3_BUCKET=your-bucket
AWS_CLOUDFRONT_URL=your-cloudfront

# VNPay (sandbox/production)
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/api/v1/payments/vnpay-return

# Search (optional)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_ENABLED=false

# Business rules
BOOKING_CANCEL_HOURS_BEFORE=8
```

## Scripts

| Lệnh                        | Mô tả                   |
| --------------------------- | ----------------------- |
| `npm run start:dev`         | Chạy watch mode         |
| `npm run build`             | Build production        |
| `npm run start:prod`        | Chạy bản build          |
| `npm run lint` / `lint:fix` | ESLint                  |
| `npm run test`              | Jest                    |
| `npm run db:push`           | Sync schema Prisma → DB |
| `npm run db:migrate`        | Prisma migrate dev      |
| `npm run db:studio`         | Prisma Studio GUI       |

## Docker Compose

| Service         | Port | Profile  | Mô tả                            |
| --------------- | ---- | -------- | -------------------------------- |
| `postgres`      | 5432 | —        | PostgreSQL 16                    |
| `redis`         | 6379 | —        | Redis 7                          |
| `elasticsearch` | 9200 | `search` | Tìm kiếm (tùy chọn)              |
| `app`           | 3001 | `full`   | Build & chạy API trong container |

```bash
docker compose up -d postgres redis              # dev thông thường
docker compose --profile search up -d            # + Elasticsearch
docker compose --profile full up -d              # chạy cả API container
```

## Modules chính

| Domain                                  | Mô tả                                      |
| --------------------------------------- | ------------------------------------------ |
| `auth`, `account`, `users`              | Đăng ký, đăng nhập, JWT, xác thực email    |
| `venues`, `courts`                      | Cơ sở, sân, giờ hoạt động, giá, block lịch |
| `bookings`                              | Tạo/giữ/hủy booking, slot availability     |
| `payments`                              | VNPay, phương thức thanh toán              |
| `chat`                                  | Hội thoại owner ↔ user (WebSocket)         |
| `favorites`, `reviews`, `notifications` | Yêu thích, đánh giá, thông báo             |
| `search`                                | Tìm kiếm (Elasticsearch khi bật)           |
| `dashboard`, `analytics`, `reports`     | Thống kê ERP                               |
| `support-tickets`, `audit-logs`         | Hỗ trợ & audit                             |
| `uploads`                               | Upload ảnh lên S3                          |

## Database (Prisma)

Các model chính: `User`, `Venue`, `Court`, `Booking`, `BookingItem`, `Payment`, `Review`, `ChatConversation`, `ChatMessage`, `Notification`, …

Schema: `prisma/schema.prisma`

## Hệ sinh thái

| Client             | Repo                                                                        | Port |
| ------------------ | --------------------------------------------------------------------------- | ---- |
| Public web         | [public-user-booking-FE](https://github.com/Minhdwc/public-user-booking-FE) | 3000 |
| ERP                | [website_booking_FE_ERP](https://github.com/Minhdwc/website_booking_FE_ERP) | 3002 |
| Mobile             | Expo app                                                                    | —    |
| **API** (repo này) | BE-booking-sport                                                            | 3001 |
