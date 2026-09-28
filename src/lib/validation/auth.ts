import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const businessInfoSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  website: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  industry: z.string().trim().min(1, "Select an industry"),
  country: z.string().trim().min(1, "Select a country"),
  currency: z.string().trim().min(1, "Select a currency"),
  timezone: z.string().trim().min(1, "Select a timezone"),
});

export const useCaseSchema = z.object({
  useCase: z.enum(["ECOMMERCE", "NEWSLETTER", "AGENCY", "SAAS", "OTHER"]),
});
