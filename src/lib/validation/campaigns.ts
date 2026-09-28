import { z } from "zod";

export const audienceSchema = z.object({
  audienceType: z.enum(["ALL", "SEGMENT"]),
  segmentId: z.string().uuid().optional().or(z.literal("")),
});

export const contentSchema = z.object({
  name: z.string().trim().min(2, "Give the campaign a name"),
  fromName: z.string().trim().min(1, "Enter a from name"),
  fromEmail: z.string().trim().email("Enter a valid from email"),
  replyTo: z.string().trim().email("Enter a valid reply-to email").optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Enter a subject line"),
  previewText: z.string().trim().max(160).optional().or(z.literal("")),
});

export const testEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const scheduleSchema = z.object({
  scheduledAt: z.string().min(1, "Choose a date and time"),
});
