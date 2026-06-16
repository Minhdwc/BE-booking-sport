export interface IBooking {
  id: string;
  userId: string;
  fieldId: string;
  timeslotId: string;
  date: string;
  status: string;
  createdAt: Date;
}
