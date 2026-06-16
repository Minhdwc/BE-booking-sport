import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { paymentsTable } from '../../db/schema';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';

@Injectable()
export class PaymentService {
  async getPayments() {
    const payments = await db.select().from(paymentsTable);
    return { message: 'Payments fetched', data: payments };
  }

  async getPaymentById(id: string) {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    if (payments.length === 0) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Payment fetched', data: payments[0] };
  }

  async createPayment(values: CreatePaymentDto) {
    const [payment] = await db.insert(paymentsTable).values(values).returning();
    return { message: 'Payment created', data: payment };
  }

  async updatePayment(id: string, values: UpdatePaymentDto) {
    await this.getPaymentById(id);
    const [payment] = await db
      .update(paymentsTable)
      .set(values)
      .where(eq(paymentsTable.id, id))
      .returning();
    return { message: 'Payment updated', data: payment };
  }

  async deletePayment(id: string) {
    await this.getPaymentById(id);
    await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
    return { message: 'Payment deleted' };
  }
}
