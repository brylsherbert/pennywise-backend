import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
  balance: z.coerce.number().min(0, { message: "Minimum balance is 0" }),
});

export const updateAccountSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }).optional(),
  balance: z.coerce.number().min(0, { message: "Minimum balance is 0" }).optional(),
});
