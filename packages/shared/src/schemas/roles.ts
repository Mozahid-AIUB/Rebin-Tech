import { z } from "zod";
import { AGENT_VEHICLES, BUSINESS_TYPES } from "../enums";
import { passwordSchema } from "./auth";

// Same US field primitives org.ts defines. Duplicated rather than exported
// across files on purpose would be worse -- these are re-declared here only
// because org.ts keeps them module-private; if a fourth signup flow appears,
// lift them into a shared `us.ts` rather than copying a third time.
const usPhone = z.string().regex(/^\d{10}$/, "Enter a 10-digit US phone number");
const usState = z.string().regex(/^[A-Z]{2}$/, "Select a state");
const usZip = z.string().regex(/^\d{5}(\d{4})?$/, "Enter a valid ZIP code");

/**
 * Business owner signup.
 *
 * Mirrors the organization flow's three-step shape (who you are -> how we
 * reach you -> account), because both create a tenant with an owner. The
 * differences are real, not cosmetic: a business has an EIN and a resale
 * posture instead of an org type and dock access.
 */
export const businessSignupSchema = z
  .object({
    businessName: z.string().min(2, "Business name is required"),
    businessType: z.enum(BUSINESS_TYPES),
    // Optional at signup: sole proprietors legitimately operate on an SSN and
    // would be blocked by a required EIN. Verification collects it later when
    // it's actually needed for payouts.
    ein: z
      .string()
      .regex(/^\d{9}$/, "Enter a 9-digit EIN")
      .optional()
      .or(z.literal("")),
    contactName: z.string().min(2, "Contact name is required"),
    workEmail: z.string().email("Enter a valid work email"),
    phone: usPhone,
    street: z.string().min(3, "Street address is required"),
    city: z.string().min(2, "City is required"),
    state: usState,
    zip: usZip,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Field agent signup.
 *
 * Two steps, not three: an agent is a person, not a tenant -- there's no
 * entity to name, no billing address, and no team. Asking them for a
 * nine-field business profile is how you lose the drivers.
 */
export const agentSignupSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    phone: usPhone,
    // Service area, not a home address: agents are routed by where they can
    // work, and a home ZIP is both more intrusive and less accurate for that.
    serviceCity: z.string().min(2, "City is required"),
    serviceState: usState,
    serviceZip: usZip,
    vehicle: z.enum(AGENT_VEHICLES),
    // Self-attested at signup and re-checked during onboarding. A hard block
    // here would stop an otherwise-valid agent whose license is in renewal.
    hasDriversLicense: z.boolean(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type BusinessSignupInput = z.infer<typeof businessSignupSchema>;
export type AgentSignupInput = z.infer<typeof agentSignupSchema>;
