# Backend — Booking Sports Fields

NestJS API under `website/backend` (`/api/v1`).

## Quick start

```bash
docker compose up -d postgres redis
npm install
npx prisma db push
npm run start:dev
```

Health check: `GET http://localhost:3001/api/v1/health`

## Environment

| Variable                                                                  | Purpose                      |
| ------------------------------------------------------------------------- | ---------------------------- |
| `DATABASE_URL`                                                            | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`                            | BullMQ + health              |
| `ACCESS_TOKEN_SECRET` / `ACCESS_TOKEN_LIFE`                               | JWT access                   |
| `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_LIFE`                             | JWT refresh                  |
| `FRONTEND_URL`                                                            | Redirect after VNPay return  |
| `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` / `VNPAY_URL` / `VNPAY_RETURN_URL` | VNPay                        |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS`                     | SMTP                         |
| `AWS_*` / CloudFront                                                      | S3 uploads                   |

## Useful scripts

- `npm run start:dev` — watch mode
- `npm run lint` / `npm run build`
- `npm run db:push`
