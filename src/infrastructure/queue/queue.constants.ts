export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  BOOKING: 'booking',
  PAYMENT: 'payment',
  ELASTIC: 'elastic',
  STATISTIC: 'statistic',
  IMAGE: 'image',
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

export const BOOKING_JOBS = {
  EXPIRE: 'expire',
} as const;

export const PAYMENT_JOBS = {
  PROCESS_WEBHOOK: 'process-webhook',
} as const;

export const ELASTIC_JOBS = {
  SYNC_VENUE: 'sync-venue',
  DELETE_VENUE: 'delete-venue',
} as const;

export const STATISTIC_JOBS = {
  PAYMENT_SUCCESS: 'payment-success',
  REVIEW_CHANGED: 'review-changed',
  FAVORITE_TOGGLED: 'favorite-toggled',
  VENUE_VIEW: 'venue-view',
} as const;

export const IMAGE_JOBS = {
  PROCESS: 'process',
} as const;
