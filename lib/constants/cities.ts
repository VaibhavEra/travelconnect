export const INDIAN_CITIES = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Pune",
  "Jaipur",
] as const;

export type IndianCity = (typeof INDIAN_CITIES)[number];
