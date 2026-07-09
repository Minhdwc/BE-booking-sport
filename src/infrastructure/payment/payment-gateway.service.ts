import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
  [key: string]: string;
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
      'http://localhost:3001/payments/vnpay-return',
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
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const sortedParams = this.sortObject(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString().replace(/\+/g, '%20');
    const signature = this.createHmacSha512(this.hashSecret, signData);
    sortedParams['vnp_SecureHash'] = signature;

    return `${this.payUrl}?${new URLSearchParams(sortedParams).toString()}`;
  }

  verifyReturnUrl(query: VnpayReturnParams): { isValid: boolean; isSuccess: boolean } {
    const { vnp_SecureHash, ...params } = query;
    const sortedParams = this.sortObject(params as Record<string, string>);
    const signData = new URLSearchParams(sortedParams).toString().replace(/\+/g, '%20');
    const expectedHash = this.createHmacSha512(this.hashSecret, signData);

    const isValid = expectedHash === vnp_SecureHash;
    const isSuccess = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

    this.logger.log(
      `VNPay return: txnRef=${params.vnp_TxnRef} | valid=${isValid} | success=${isSuccess}`,
    );

    return { isValid, isSuccess };
  }

  getTransactionRef(query: VnpayReturnParams): string {
    return query.vnp_TxnRef;
  }

  getAmount(query: VnpayReturnParams): number {
    return parseInt(query.vnp_Amount) / 100;
  }

  private createHmacSha512(secret: string, data: string): string {
    return crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {});
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      String(date.getFullYear()) +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}
