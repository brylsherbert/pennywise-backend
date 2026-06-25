import { z } from "zod";

export const createTransactionSchema = z.object({
  account_id: z.uuid({ message: "Invalid account_id, must be a valid UUID" }).optional().nullable(),
  budget_id: z.uuid({ message: "Invalid budget_id, must be a valid UUID" }).optional().nullable(),
  type: z.enum(["income", "expense", "fill"]),
  amount: z.coerce.number().min(0, { message: "Amount must be at least 0" }).optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  budgets: z
  .array(
    z.object({
      budget_id: z.uuid({ message: "Invalid budget_id in budgets array, must be a valid UUID" }),
      new_allocated_amount: z.coerce.number().min(0, { message: "Allocated amount must be at least 0" }).optional(),
    })
  )
  .optional()
});

export const updateTransactionSchema = z.object({
  account_id: z.uuid({ message: "Invalid account_id, must be a valid UUID" }).optional().nullable(),
  budget_id: z.uuid({ message: "Invalid budget_id, must be a valid UUID" }).optional().nullable(),
  type: z.enum(["income", "expense", "fill"]).optional(),
  amount: z.coerce.number().min(0, { message: "Amount must be at least 0" }).optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }).optional(),
  budgets: z
    .array(
      z.object({
        budget_id: z.uuid({ message: "Invalid budget_id in budgets array, must be a valid UUID" }),
        new_allocated_amount: z.coerce.number().min(0, { message: "Allocated amount must be at least 0" }).optional(),
      })
    )
    .optional()
});
