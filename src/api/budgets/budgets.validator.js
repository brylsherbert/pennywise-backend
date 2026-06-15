import { z } from "zod";

export const createBudgetSchema = z.object({
  category_id: z.uuid({ message: "Invalid category_id, must be a valid UUID" }).optional().nullable(),
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
  target_amount: z.coerce.number().min(0, { message: "Target amount must be >= 0" }),
});

export const updateBudgetSchema = z.object({
  category_id: z.uuid({ message: "Invalid category_id, must be a valid UUID" }).optional().nullable(),
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }).optional(),
  target_amount: z.coerce.number().min(0, { message: "Target amount must be >= 0" }).optional(),
});
