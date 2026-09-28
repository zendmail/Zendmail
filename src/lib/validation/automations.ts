import { z } from "zod";

export const createAutomationSchema = z.object({
  name: z.string().trim().min(2, "Give the automation a name"),
  triggerType: z.enum(["CONTACT_CREATED", "TAG_ADDED"]),
  tagName: z.string().trim().optional(),
});

export const stepTypeValues = ["SEND_EMAIL", "WAIT", "ADD_TAG", "REMOVE_TAG"] as const;
