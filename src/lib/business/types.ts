/**
 * NESale business type model.
 *
 * NESale supports exactly two product lines:
 *  - ecommerce: online store with a product catalog
 *  - services: appointment/booking businesses (restaurants, clinics, trades,
 *    professional services, salons, agencies)
 */

export type BusinessType = "ecommerce" | "services";

export const BUSINESS_TYPES: BusinessType[] = ["ecommerce", "services"];

export const SERVICE_SUBTYPES = [
  "restaurant",
  "clinic",
  "trade",
  "professional",
  "salon",
  "other",
] as const;

export type ServiceSubtype = (typeof SERVICE_SUBTYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  ecommerce: "Online Store / E-commerce",
  services: "Services & Appointments",
};

export const SERVICE_SUBTYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant / Cafe",
  clinic: "Clinic / Healthcare",
  trade: "Trade / Contractor (plumbing, repair)",
  professional: "Professional Services (legal, agency, consulting)",
  salon: "Salon / Spa / Gym",
  other: "Other Services",
};

const LEGACY_SERVICE_TYPES = new Set([
  "services",
  "service",
  "local_service",
  "professional",
  "appointments",
  "healthcare",
  "provider",
]);

/**
 * Normalizes any historical business type value into the two supported types.
 */
export function normalizeBusinessType(value?: string | null): BusinessType {
  if (!value) return "ecommerce";
  const normalized = value.trim().toLowerCase();
  if (normalized === "ecommerce") return "ecommerce";
  if (LEGACY_SERVICE_TYPES.has(normalized)) return "services";
  return "ecommerce";
}

export function isServicesBusiness(value?: string | null): boolean {
  return normalizeBusinessType(value) === "services";
}

export function isEcommerceBusiness(value?: string | null): boolean {
  return normalizeBusinessType(value) === "ecommerce";
}

export function normalizeServiceSubtype(value?: string | null): ServiceSubtype | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (SERVICE_SUBTYPES as readonly string[]).includes(normalized)
    ? (normalized as ServiceSubtype)
    : "other";
}

export function getServiceSubtypeLabel(value?: string | null): string {
  if (!value) return "";
  return SERVICE_SUBTYPE_LABELS[value] || value;
}

/**
 * Features available for each business type. Shared features apply to both.
 */
export const TYPE_FEATURES: Record<BusinessType, string[]> = {
  ecommerce: ["products", "knowledge", "conversations", "leads", "analytics", "website", "team_management"],
  services: ["services", "appointments", "knowledge", "conversations", "leads", "analytics", "website", "team_management"],
};

export function getFeaturesForType(value?: string | null): string[] {
  return TYPE_FEATURES[normalizeBusinessType(value)] ?? TYPE_FEATURES.ecommerce;
}

export function isFeatureEnabledForType(feature: string, value?: string | null): boolean {
  return getFeaturesForType(value).includes(feature);
}
