export interface IPayment {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  createdAt: Date;
}

