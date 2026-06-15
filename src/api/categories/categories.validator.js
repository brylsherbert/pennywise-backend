import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),
  color: z.string(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }).optional(),
  color: z.string().optional(),
});