import {
  integer,
  pgTable,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  username: varchar({ length: 255 }).notNull().unique(),
  email: varchar({ length: 255 }).notNull().unique(),
  phone: varchar({ length: 20 }),
  password: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 50 }).notNull().default('user'),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const sportsTable = pgTable('sports', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const venuesTable = pgTable('venues', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  location: varchar({ length: 255 }).notNull(),
  description: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const fieldsTable = pgTable('fields', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  price: integer().notNull(),
  status: varchar({ length: 50 }).notNull().default('active'),
  sportId: uuid()
    .notNull()
    .references(() => sportsTable.id),
  venueId: uuid()
    .notNull()
    .references(() => venuesTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const timeslotsTable = pgTable('timeslots', {
  id: uuid().primaryKey().defaultRandom(),
  startTime: time().notNull(),
  endTime: time().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const bookingsTable = pgTable(
  'bookings',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => usersTable.id),
    fieldId: uuid()
      .notNull()
      .references(() => fieldsTable.id),
    timeslotId: uuid()
      .notNull()
      .references(() => timeslotsTable.id),
    date: date().notNull(),
    status: varchar({ length: 50 }).notNull().default('pending'),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueBooking: uniqueIndex('unique_booking').on(table.fieldId, table.date, table.timeslotId),
  }),
);

export const paymentsTable = pgTable('payments', {
  id: uuid().primaryKey().defaultRandom(),
  bookingId: uuid()
    .notNull()
    .references(() => bookingsTable.id),
  amount: integer().notNull(),
  method: varchar({ length: 50 }).notNull().default('credit_card'),
  status: varchar({ length: 50 }).notNull().default('pending'),
  createdAt: timestamp().notNull().defaultNow(),
});

export const reviewsTable = pgTable('reviews', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  fieldId: uuid()
    .notNull()
    .references(() => fieldsTable.id),
  rating: integer().notNull(),
  comment: text(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const notificationsTable = pgTable('notifications', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => usersTable.id),
  title: varchar({ length: 255 }).notNull(),
  message: text().notNull(),
  isRead: boolean().notNull().default(false),
  createdAt: timestamp().notNull().defaultNow(),
});
