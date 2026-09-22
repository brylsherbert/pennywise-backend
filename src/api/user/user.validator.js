import { z } from "zod";

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(6, { message: "Username must be at least 6 characters long" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
});

const uniqueClientIds = (items, ctx, path) =>
{
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.client_id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate client_id in ${path}`,
        path: [path],
      });
      return;
    }
    seen.add(item.client_id);
  }
};

export const importGuestDataSchema = z.object({
  categories: z
    .array(
      z.object({
        client_id: z.uuid({ message: "Invalid category client_id, must be a valid UUID" }),
        name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
        color: z.string(),
      })
    )
    .default([]),
  accounts: z
    .array(
      z.object({
        client_id: z.uuid({ message: "Invalid account client_id, must be a valid UUID" }),
        name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
        balance: z.coerce.number().min(0, { message: "Minimum balance is 0" }),
      })
    )
    .default([]),
  budgets: z
    .array(
      z.object({
        client_id: z.uuid({ message: "Invalid budget client_id, must be a valid UUID" }),
        category_client_id: z.uuid({ message: "Invalid category_client_id, must be a valid UUID" }).nullable(),
        name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
        target_amount: z.coerce.number().min(0, { message: "Target amount must be >= 0" }),
      })
    )
    .default([]),
  transactions: z
    .array(
      z.object({
        client_id: z.uuid({ message: "Invalid transaction client_id, must be a valid UUID" }),
        account_client_id: z.uuid({ message: "Invalid account_client_id, must be a valid UUID" }).nullable(),
        budget_client_id: z.uuid({ message: "Invalid budget_client_id, must be a valid UUID" }).nullable(),
        type: z.enum(["income", "expense", "fill"]),
        amount: z.coerce.number().min(0, { message: "Amount must be at least 0" }).optional(),
        title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
        transaction_date: z.iso.datetime({
          offset: true,
          local: true,
          message: "transaction_date must be a valid ISO-8601 datetime",
        }),
        budgets: z
          .array(
            z.object({
              budget_client_id: z.uuid({ message: "Invalid budget_client_id in budgets array, must be a valid UUID" }),
              new_allocated_amount: z.coerce.number().min(0, { message: "Allocated amount must be at least 0" }),
            })
          )
          .optional()
          .default([]),
      })
    )
    .default([]),
}).superRefine((data, ctx) =>
{
  uniqueClientIds(data.categories, ctx, "categories");
  uniqueClientIds(data.accounts, ctx, "accounts");
  uniqueClientIds(data.budgets, ctx, "budgets");
  uniqueClientIds(data.transactions, ctx, "transactions");
});
