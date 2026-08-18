import { z } from "zod";
import { AGENT_VEHICLES, BUSINESS_TYPES, ORG_TYPES, SUPPLIER_BUSINESS_TYPE } from "../enums";
import { passwordSchema } from "./auth";
import type { OrgSignupInput } from "./org";
import type { AgentSignupInput, BusinessSignupInput } from "./roles";

/** The four self-service signup paths, as chosen on the role picker. */
export const SIGNUP_ROLES = ["organization", "business", "agent", "supplier"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

const usPhone = z.string().regex(/^\d{10}$/, "Enter a 10-digit US phone number");
const usState = z.string().regex(/^[A-Z]{2}$/, "Select a state");
const usZip = z.string().regex(/^\d{5}(\d{4})?$/, "Enter a valid ZIP code");

// Every role answers these: who you are, how we reach you, where you operate,
// and your password. Only the middle block differs.
const commonFields = {
  contactName: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: usPhone,
  city: z.string().min(2, "City is required"),
  state: usState,
  zip: usZip,
  password: passwordSchema,
  confirmPassword: z.string(),
};

const passwordsMatch = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

/**
 * One form, four shapes.
 *
 * A discriminated union rather than one flat object with optional fields: it
 * makes "an agent has no EIN" a type error instead of a runtime convention,
 * and it keeps each role's required fields genuinely required. The form
 * validates against the variant matching the currently-selected role, so
 * switching the dropdown switches which fields must be filled.
 *
 * The password-match rule sits on the union rather than on each member:
 * z.discriminatedUnion requires plain ZodObject members, and .refine() returns
 * a ZodEffects, which it rejects. Refining the union instead applies the same
 * check to all three variants and keeps the error on `confirmPassword`.
 */
export const signupFormSchema = z
  .discriminatedUnion("role", [
    z.object({
      role: z.literal("organization"),
      ...commonFields,
      entityName: z.string().min(2, "Organization name is required"),
      orgType: z.enum(ORG_TYPES),
      street: z.string().min(3, "Street address is required"),
      // Loading dock access is deliberately NOT collected here. It's
      // per-pickup logistics, not account data -- pickupRequestSchema already
      // takes a dock address -- and at signup the person creating the account
      // often has no idea whether a freight truck can back in. See
      // toOrgSignupInput below for what the endpoint receives instead.
    }),
    z.object({
      role: z.literal("business"),
      ...commonFields,
      entityName: z.string().min(2, "Business name is required"),
      businessType: z.enum(BUSINESS_TYPES),
      street: z.string().min(3, "Street address is required"),
      // Optional: sole proprietors operate on an SSN and have no EIN yet.
      ein: z.string().regex(/^\d{9}$/, "Enter a 9-digit EIN").optional().or(z.literal("")),
    }),
    z.object({
      role: z.literal("supplier"),
      ...commonFields,
      entityName: z.string().min(2, "Your name or trading name is required"),
      street: z.string().min(3, "Street address is required"),
      // No EIN and no business type. A supplier is frequently one person
      // working out of a garage -- asking for a federal tax number at signup
      // turns away the exact audience this role exists to reach, and
      // businesses.ein has been nullable since 0011 for this case.
    }),
    z.object({
      role: z.literal("agent"),
      ...commonFields,
      // No entity name and no street: an agent is a person, and what routing
      // needs is the area they can cover, not where they sleep.
      vehicle: z.enum(AGENT_VEHICLES),
      hasDriversLicense: z.boolean(),
    }),
  ])
  .refine((v) => v.password === v.confirmPassword, passwordsMatch);

export type SignupFormInput = z.infer<typeof signupFormSchema>;

// -- Adapters -----------------------------------------------------------
// The signup endpoints predate this shared form and each own their payload
// shape (and their Edge Function + RPC). Rather than reshaping those backend
// contracts to match one UI, the form maps outward here. That keeps the seam
// in one readable place instead of scattering field renames through the
// screen. Supplier is the exception: it has no endpoint of its own -- it
// reuses the business endpoint with businessType fixed to "supplier".

export function toOrgSignupInput(v: Extract<SignupFormInput, { role: "organization" }>): OrgSignupInput {
  return {
    orgName: v.entityName,
    orgType: v.orgType,
    contactName: v.contactName,
    // The org endpoint requires a job title that this unified form no longer
    // asks for -- one more field on a long page, for something verification
    // confirms anyway. Sent as the neutral default the backend accepts.
    contactTitle: "Primary contact",
    workEmail: v.email,
    phone: v.phone,
    street: v.street,
    city: v.city,
    state: v.state,
    zip: v.zip,
    // Not asked at signup (see the organization variant above). The
    // organizations table defaults this column to false and the real answer
    // is captured per pickup, so the endpoint gets the same default.
    dockAccess: false,
    password: v.password,
    confirmPassword: v.confirmPassword,
  };
}

export function toBusinessSignupInput(v: Extract<SignupFormInput, { role: "business" }>): BusinessSignupInput {
  return {
    businessName: v.entityName,
    businessType: v.businessType,
    ein: v.ein ?? "",
    contactName: v.contactName,
    workEmail: v.email,
    phone: v.phone,
    street: v.street,
    city: v.city,
    state: v.state,
    zip: v.zip,
    password: v.password,
    confirmPassword: v.confirmPassword,
  };
}

export function toSupplierSignupInput(v: Extract<SignupFormInput, { role: "supplier" }>): BusinessSignupInput {
  return {
    businessName: v.entityName,
    businessType: SUPPLIER_BUSINESS_TYPE,
    ein: "",
    contactName: v.contactName,
    workEmail: v.email,
    phone: v.phone,
    street: v.street,
    city: v.city,
    state: v.state,
    zip: v.zip,
    password: v.password,
    confirmPassword: v.confirmPassword,
  };
}

export function toAgentSignupInput(v: Extract<SignupFormInput, { role: "agent" }>): AgentSignupInput {
  return {
    fullName: v.contactName,
    email: v.email,
    phone: v.phone,
    serviceCity: v.city,
    serviceState: v.state,
    serviceZip: v.zip,
    vehicle: v.vehicle,
    hasDriversLicense: v.hasDriversLicense,
    password: v.password,
    confirmPassword: v.confirmPassword,
  };
}
