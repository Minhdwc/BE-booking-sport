import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface BookingConfirmationData {
  name: string;
  fieldName: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  amount: number;
  bookingId: string;
}

export interface BookingCancelledData {
  name: string;
  fieldName: string;
  date: string;
  reason?: string;
}

export interface PaymentConfirmationData {
  name: string;
  amount: number;
  bookingId: string;
}

const renderBookingConfirmationEmail = (data: BookingConfirmationData): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#15803d;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">✅ Đặt sân thành công!</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">Xin chào <strong>${data.name}</strong>,</p>
      <p style="color:#374151;">Đặt sân của bạn đã được xác nhận. Dưới đây là thông tin chi tiết:</p>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Mã đặt sân</td>
            <td style="padding:10px 0;color:#111827;font-weight:600;text-align:right;font-size:14px;">#${data.bookingId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Khu thể thao</td>
            <td style="padding:10px 0;color:#111827;font-weight:600;text-align:right;font-size:14px;">${data.venueName}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Tên sân</td>
            <td style="padding:10px 0;color:#111827;font-weight:600;text-align:right;font-size:14px;">${data.fieldName}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Ngày đặt</td>
            <td style="padding:10px 0;color:#111827;font-weight:600;text-align:right;font-size:14px;">${data.date}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Giờ thi đấu</td>
            <td style="padding:10px 0;color:#111827;font-weight:600;text-align:right;font-size:14px;">${data.startTime} - ${data.endTime}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#6b7280;font-size:14px;">Tổng tiền</td>
            <td style="padding:10px 0;color:#15803d;font-weight:700;text-align:right;font-size:16px;">${data.amount.toLocaleString('vi-VN')} VNĐ</td>
          </tr>
        </table>
      </div>
      <p style="color:#374151;font-size:14px;">Vui lòng có mặt trước <strong>15 phút</strong> so với giờ đặt sân.</p>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Minh Đức Booking Sport - Hệ thống quản lý sân thể thao</p>
    </div>
  </div>
</body>
</html>`;
};

const renderBookingCancelledEmail = (data: BookingCancelledData): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#dc2626;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">❌ Đặt sân đã bị hủy</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">Xin chào <strong>${data.name}</strong>,</p>
      <p style="color:#374151;">Đặt sân <strong>${data.fieldName}</strong> ngày <strong>${data.date}</strong> của bạn đã bị hủy.</p>
      ${data.reason ? `<p style="color:#374151;">Lý do: <em>${data.reason}</em></p>` : ''}
      <p style="color:#374151;font-size:14px;">Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Minh Đức Booking Sport - Hệ thống quản lý sân thể thao</p>
    </div>
  </div>
</body>
</html>`;
};

const renderWelcomeEmail = (name: string): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#2563eb;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">👋 Chào mừng đến với Minh Đức Booking Sport</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">Xin chào <strong>${name}</strong>,</p>
      <p style="color:#374151;">Tài khoản của bạn đã được tạo thành công. Bạn có thể bắt đầu tìm và đặt sân ngay bây giờ!</p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#f97316;border-radius:8px;">
            <a href="#" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
              Khám phá sân gần bạn
            </a>
          </td>
        </tr>
      </table>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Minh Đức Booking Sport - Hệ thống quản lý sân thể thao</p>
    </div>
  </div>
</body>
</html>`;
};

const renderPaymentConfirmationEmail = (data: PaymentConfirmationData): string => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#7c3aed;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">💳 Thanh toán thành công!</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:16px;">Xin chào <strong>${data.name}</strong>,</p>
      <p style="color:#374151;">Chúng tôi đã nhận được thanh toán của bạn cho đơn đặt sân.</p>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#6b7280;font-size:14px;">Mã đặt sân: <strong style="color:#111827;">#${data.bookingId.slice(0, 8).toUpperCase()}</strong></p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Số tiền: <strong style="color:#7c3aed;font-size:18px;">${data.amount.toLocaleString('vi-VN')} VNĐ</strong></p>
      </div>
    </div>
    <div style="background:#f9fafb;padding:20px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Minh Đức Booking Sport - Hệ thống quản lý sân thể thao</p>
    </div>
  </div>
</body>
</html>`;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  private get fromAddress() {
    return `"Minh Đức Booking Sport" <${this.config.get<string>('MAIL_USER')}>`;
  }

  async sendBookingConfirmation(to: string, data: BookingConfirmationData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: '✅ Xác nhận đặt sân thành công - Minh Đức Booking Sport',
        html: renderBookingConfirmationEmail(data),
      });
      this.logger.log(`Booking confirmation sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send booking confirmation to ${to}`, err);
    }
  }

  async sendBookingCancelled(to: string, data: BookingCancelledData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: '❌ Đặt sân đã bị hủy - Minh Đức Booking Sport',
        html: renderBookingCancelledEmail(data),
      });
      this.logger.log(`Booking cancelled email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send booking cancelled email to ${to}`, err);
    }
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: '👋 Chào mừng bạn đến với Minh Đức Booking Sport!',
        html: renderWelcomeEmail(name),
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${to}`, err);
    }
  }

  async sendPaymentConfirmation(to: string, data: PaymentConfirmationData): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: '💳 Thanh toán thành công - Minh Đức Booking Sport',
        html: renderPaymentConfirmationEmail(data),
      });
      this.logger.log(`Payment confirmation sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send payment confirmation to ${to}`, err);
    }
  }
}
