import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  age: integer("age"),
  height: integer("height"),
  weight: real("weight"),
  units: text("units").notNull().default("kg"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const weightUnits = ["kg", "lb"] as const;
export type WeightUnit = (typeof weightUnits)[number];
export const weightUnitSchema = z.enum(weightUnits);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
