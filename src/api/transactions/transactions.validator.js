import { z } from "zod";

export const createTransactionSchema = z.object({
  account_id: z.uuid({ message: "Invalid account_id, must be a valid UUID" }).optional().nullable(),
  budget_id: z.uuid({ message: "Invalid budget_id, must be a valid UUID" }).optional().nullable(),
  type: z.enum(["income", "expense", "fill"]),
  amount: z.coerce.number().min(1, { message: "Amount must be at least 1" }),
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
});

export const updateTransactionSchema = z.object({
  account_id: z.uuid({ message: "Invalid account_id, must be a valid UUID" }).optional().nullable(),
  budget_id: z.uuid({ message: "Invalid budget_id, must be a valid UUID" }).optional().nullable(),
  type: z.enum(["income", "expense", "fill"]).optional(),
  amount: z.coerce.number().min(1, { message: "Amount must be at least 1" }).optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }).optional(),
});
