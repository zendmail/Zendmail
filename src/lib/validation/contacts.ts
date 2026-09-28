import { z } from "zod";

export const contactStatusValues = [
  "SUBSCRIBER",
  "CUSTOMER",
  "LEAD",
  "VIP",
  "INACTIVE",
  "UNSUBSCRIBED",
  "BOUNCED",
] as const;

export const createContactSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  firstName: z.string().trim().max(120).optional().or(z.literal("")),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(contactStatusValues).default("SUBSCRIBER"),
});

export const updateContactSchema = createContactSchema.extend({
  id: z.string().uuid(),
});

export const csvRowSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});
