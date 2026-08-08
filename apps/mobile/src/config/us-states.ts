export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
] as const;

export const ORG_TYPE_OPTIONS = [
  { value: "k12_school", label: "K-12 School" },
  { value: "university", label: "University" },
  { value: "hospital", label: "Hospital / Clinic" },
  { value: "municipal_office", label: "Municipal Office" },
  { value: "corporate_hq", label: "Corporate Headquarters" },
  { value: "other", label: "Other" },
] as const;

export const SIGNUP_ROLE_OPTIONS = [
  { value: "organization", label: "Organization" },
  { value: "business", label: "Business owner" },
  { value: "agent", label: "Field agent" },
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  { value: "repair_shop", label: "Repair Shop" },
  { value: "electronics_retailer", label: "Electronics Retailer" },
  { value: "scrap_dealer", label: "Scrap Dealer" },
  { value: "it_reseller", label: "IT Reseller" },
  { value: "refurbisher", label: "Refurbisher" },
  { value: "other", label: "Other" },
] as const;

export const AGENT_VEHICLE_OPTIONS = [
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "box_truck", label: "Box Truck" },
  { value: "none", label: "No vehicle yet" },
] as const;

export const DEVICE_CATEGORY_OPTIONS = [
  { value: "computers_laptops", label: "Computers & Laptops" },
  { value: "monitors_displays", label: "Monitors & Displays" },
  { value: "server_gear", label: "Server Gear" },
  { value: "copiers_printers", label: "Copiers & Printers" },
  { value: "batteries_ups", label: "Batteries & UPS Units" },
] as const;

export const TIME_WINDOW_OPTIONS = [
  { value: "08:00-11:00", label: "8 – 11 AM" },
  { value: "09:00-12:00", label: "9 AM – 12 PM" },
  { value: "12:00-15:00", label: "12 – 3 PM" },
  { value: "13:00-16:00", label: "1 – 4 PM" },
] as const;
