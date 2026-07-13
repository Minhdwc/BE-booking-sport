export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
} as const;

export const EMAIL_JOBS = {
  BOOKING_CONFIRMATION: 'booking-confirmation',
  BOOKING_CANCELLED: 'booking-cancelled',
  PAYMENT_CONFIRMATION: 'payment-confirmation',
  NEW_BOOKING_OWNER: 'new-booking-owner',
  WELCOME: 'welcome',
} as const;

export const NOTIFICATION_JOBS = {
  CREATE: 'create',
} as const;
