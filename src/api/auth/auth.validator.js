import { z } from "zod";

export const createUserSchema = z.object({
    username: z
        .string()
        .min(6, { message: "Username must be at least 6 characters long" }),
    email: z.email(),
    password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters long" }),
});

export const loginUserSchema = z.object({
    email: z.email(),
    password: z
        .string()
        .min(6, { message: "Password must be at least 6 characters long" }),
});
