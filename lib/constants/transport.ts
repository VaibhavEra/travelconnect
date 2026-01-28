import { Ionicons } from "@expo/vector-icons";

export const TRANSPORT_MODES = ["train", "bus", "flight", "car"] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const TRANSPORT_CONFIG: Record<
  TransportMode,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  train: {
    label: "Train",
    icon: "train",
  },
  bus: {
    label: "Bus",
    icon: "bus",
  },
  flight: {
    label: "Flight",
    icon: "airplane",
  },
  car: {
    label: "Car",
    icon: "car",
  },
};

// For filter/selector components with "all" option
export const TRANSPORT_MODES_WITH_ALL = ["all", ...TRANSPORT_MODES] as const;

export type TransportModeWithAll = (typeof TRANSPORT_MODES_WITH_ALL)[number];

export const TRANSPORT_CONFIG_WITH_ALL: Record<
  TransportModeWithAll,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  all: {
    label: "All",
    icon: "apps",
  },
  ...TRANSPORT_CONFIG,
};

// Icon mapping for transport modes (used in trip/request displays)
export const TRANSPORT_ICONS: Record<
  TransportMode,
  keyof typeof Ionicons.glyphMap
> = {
  train: "train",
  bus: "bus",
  flight: "airplane",
  car: "car",
};
