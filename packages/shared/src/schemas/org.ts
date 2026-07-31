import { z } from "zod";
import { DEVICE_CATEGORIES, MIN_PICKUP_UNITS, ORG_TYPES, SIZE_TIER_VALUES } from "../enums";
import { passwordSchema } from "./auth";

const usPhone = z.string().regex(/^\d{10}$/, "Enter a 10-digit US phone number");
const usState = z.string().regex(/^[A-Z]{2}$/, "Select a state");
const usZip = z.string().regex(/^\d{5}(\d{4})?$/, "Enter a valid ZIP code");

export const orgSignupSchema = z
  .object({
    orgName: z.string().min(2, "Organization name is required"),
    orgType: z.enum(ORG_TYPES),
    contactName: z.string().min(2, "Contact name is required"),
    contactTitle: z.string().min(2, "Contact title is required"),
    workEmail: z.string().email("Enter a valid work email"),
    phone: usPhone,
    street: z.string().min(3, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: usState,
    zip: usZip,
    dockAccess: z.boolean(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const pickupRequestSchema = z
  .object({
    sizeTier: z.enum(SIZE_TIER_VALUES),
    unitCount: z
      .number()
      .int("Enter a whole number")
      .min(MIN_PICKUP_UNITS, `Minimum ${MIN_PICKUP_UNITS} devices required for pickup`),
    categories: z.array(z.enum(DEVICE_CATEGORIES)).min(1, "Select at least one category"),
    windowStart: z.string().datetime(),
    windowEnd: z.string().datetime(),
    onSiteContactName: z.string().min(2, "On-site contact is required"),
    onSiteContactPhone: usPhone,
    dockAddress: z.string().min(3, "Dock address is required"),
    instructions: z.string().max(1000).default(""),
  })
  .refine((v) => new Date(v.windowEnd) > new Date(v.windowStart), {
    message: "End time must be after start time",
    path: ["windowEnd"],
  });

export type OrgSignupInput = z.infer<typeof orgSignupSchema>;
export type PickupRequestInput = z.infer<typeof pickupRequestSchema>;
