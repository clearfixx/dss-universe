import { z } from "zod";

export type AuthMode = "login" | "register" | "recovery" | "reset";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string[]>;
  values?: {
    displayName?: string;
    username?: string;
    email?: string;
    remember?: boolean;
  };
};

export const initialAuthFormState: AuthFormState = { status: "idle" };

const email = z.string().trim().email("Enter a valid email address.");
const password = z
  .string()
  .min(8, "Password must contain at least 8 characters.");

export const loginSchema = z.object({
  email,
  password,
  twoFactorCode: z.preprocess(
    (value) => String(value ?? "").trim() || undefined,
    z
      .string()
      .regex(
        /^(?:\d{6}|[a-f0-9]{6}-[a-f0-9]{6})$/i,
        "Enter a 6-digit authenticator code or a recovery code.",
      )
      .optional(),
  ),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must contain at least 2 characters.")
      .max(80, "Display name is too long."),
    username: z
      .string()
      .trim()
      .min(3, "Username must contain at least 3 characters.")
      .max(32, "Username is too long.")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Use letters, numbers, underscores or hyphens only.",
      ),
    email,
    password,
    confirmPassword: z.string(),
    terms: z.literal("on", {
      error: "Accept the Terms of Service to create an account.",
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const recoverySchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/, "Invalid reset link. Request a new one."),
    password: password.refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password must not exceed 72 UTF-8 bytes.",
    ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
