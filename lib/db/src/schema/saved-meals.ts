import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const savedMealsTable = pgTable("saved_meals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSavedMealSchema = createInsertSchema(savedMealsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertSavedMeal = z.infer<typeof insertSavedMealSchema>;
export type SavedMeal = typeof savedMealsTable.$inferSelect;
