// import {
//   pgTable,
//   serial,
//   varchar,
//   integer,
//   numeric,
// } from "drizzle-orm/pg-core";

// export const Budgets = pgTable("budgets", {
//   id: serial("id").primaryKey(),
//   name: varchar("name").notNull(),
//   amount: varchar("amount").notNull(),
//   icon: varchar("icon"),
//   createdBy: varchar("createdBy").notNull(),
// });

// export const expenses = pgTable("expenses", {
//   id: serial("id").primaryKey(),
//   name: varchar("name").notNull(),
//   amount: numeric("amount").notNull().default(0),
//   budgetId: integer("budgetId").references(() => Budgets.id),
//   createdAt: varchar("createdAt").notNull(),
// });

// export const incomes = pgTable("incomes", {
//   id: serial("id").primaryKey(),
//   name: varchar("name").notNull(),
//   amount: varchar("amount").notNull(),
//   icon: varchar("icon"),
//   createdBy: varchar("createdBy").notNull(),
// });

// export const incomeEntries = pgTable("income_entries", {
//   id: serial("id").primaryKey(),
//   name: varchar("name").notNull(),
//   amount: numeric("amount").notNull().default(0),
//   incomeId: integer("incomeId").references(() => incomes.id),
//   createdAt: varchar("createdAt").notNull(),
//   createdBy: varchar("createdBy").notNull(),
//   category: varchar("category").notNull().default("salary"),
// });