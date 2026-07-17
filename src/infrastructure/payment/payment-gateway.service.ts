import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';

export interface VnpayCreatePaymentParams {
  amount: number;
  bookingId: string;
  orderInfo: string;
  ipAddr: string;
  returnUrl?: string;
  locale?: 'vn' | 'en';
}

export interface VnpayReturnParams {
  vnp_TxnRef: string;
  vnp_Amount: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_SecureHash: string;
  vnp_TransactionNo?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly payUrl: string;
  private readonly returnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.tmnCode = this.config.get('VNPAY_TMN_CODE', '');
    this.hashSecret = this.config.get('VNPAY_HASH_SECRET', '');
    this.payUrl = this.config.get(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    this.returnUrl = this.config.get(
      'VNPAY_RETURN_URL',
      'http://localhost:3001/api/v1/payments/vnpay-return',
    );
  }

  createPaymentUrl(params: VnpayCreatePaymentParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: params.locale ?? 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.bookingId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(params.amount * 100),
      vnp_ReturnUrl: params.returnUrl ?? this.returnUrl,
      vnp_IpAddr: this.normalizeIp(params.ipAddr),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, undefined, undefined, {
      encodeURIComponent: (value) => value,
    });
    const signature = this.createHmacSha512(this.hashSecret, signData);
    sortedParams.vnp_SecureHash = signature;

    return `${this.payUrl}?${querystring.stringify(sortedParams, undefined, undefined, {
      encodeURIComponent: (value) => value,
    })}`;
  }

  verifyReturnUrl(query: VnpayReturnParams): { isValid: boolean; isSuccess: boolean } {
    const secureHash = query.vnp_SecureHash;
    const cleaned: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (
        value !== undefined &&
        value !== null &&
        key !== 'vnp_SecureHash' &&
        key !== 'vnp_SecureHashType'
      ) {
        cleaned[key] = String(value);
      }
    }

    const sortedParams = this.sortObject(cleaned);
    const signData = querystring.stringify(sortedParams, undefined, undefined, {
      encodeURIComponent: (value) => value,
    });
    const expectedHash = this.createHmacSha512(this.hashSecret, signData);

    const isValid = expectedHash === secureHash;
    const isSuccess = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';

    this.logger.log(
      `VNPay return: txnRef=${query.vnp_TxnRef} | valid=${isValid} | success=${isSuccess}`,
    );

    return { isValid, isSuccess };
  }

  getTransactionRef(query: VnpayReturnParams): string {
    return query.vnp_TxnRef;
  }

  getAmount(query: VnpayReturnParams): number {
    return parseInt(query.vnp_Amount, 10) / 100;
  }

  private createHmacSha512(secret: string, data: string): string {
    return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
  }

  /** Official VNPay demo sortObject: encode values, spaces as `+`. */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj)
      .filter((key) => obj[key] !== undefined && obj[key] !== null && obj[key] !== '')
      .map((key) => encodeURIComponent(key))
      .sort();

    for (const encodedKey of keys) {
      const originalKey = decodeURIComponent(encodedKey);
      sorted[encodedKey] = encodeURIComponent(obj[originalKey]).replace(/%20/g, '+');
    }

    return sorted;
  }

  private normalizeIp(ipAddr: string): string {
    if (!ipAddr || ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    if (ipAddr.startsWith('::ffff:')) {
      return ipAddr.slice(7);
    }
    return ipAddr;
  }

  /** VNPay expects GMT+7 timestamps: yyyyMMddHHmmss */
  private formatDate(date: Date): string {
    const vn = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      String(vn.getFullYear()) +
      pad(vn.getMonth() + 1) +
      pad(vn.getDate()) +
      pad(vn.getHours()) +
      pad(vn.getMinutes()) +
      pad(vn.getSeconds())
    );
  }
}
