import { z } from "zod";
import {
  PAGE_INCLUSIONS,
  PALETTE_IDS,
  PRIMARY_CTAS,
  PROPERTY_TYPES_FEATURED,
  TEMPLATE_STARTS,
  TONES,
} from "./types";

const optionalText = z.string().optional();

const fileRef = z.object({
  name: z.string(),
  url: z.string(),
});

export const setupFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  tagline: optionalText,
  currentWebsiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  targetAudience: optionalText,

  logoPrimary: fileRef.optional(),
  logoSecondary: fileRef.optional(),
  additionalLogos: z.array(fileRef).default([]),

  palette: z.enum(PALETTE_IDS),
  templateStart: z.enum(TEMPLATE_STARTS).default("ai_generate"),

  customInstructions: optionalText,
  inspirationImages: z.array(fileRef).max(4).default([]),

  propertyTypesFeatured: z.array(z.enum(PROPERTY_TYPES_FEATURED)).optional(),
  pagesToInclude: z.array(z.enum(PAGE_INCLUSIONS)).optional(),
  tone: z.enum(TONES).optional(),
  primaryCta: z.enum(PRIMARY_CTAS).optional(),
  brandVoiceNotes: optionalText,

  phoneNumber: z
    .string()
    .regex(/^[0-9+\-()\s]*$/, "Phone number contains invalid characters")
    .optional(),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  serviceArea: optionalText,
  yearsInBusiness: z.coerce.number().int().nonnegative().optional(),
  numberOfProperties: z.coerce.number().int().nonnegative().optional(),
  numberOfUnits: z.coerce.number().int().nonnegative().optional(),
  hoursOfOperation: optionalText,

  socialFacebook: optionalText,
  socialInstagram: optionalText,
  socialLinkedin: optionalText,
  socialX: optionalText,
});
