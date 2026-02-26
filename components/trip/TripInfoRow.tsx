import {
  getSizeCapacityIcon,
  getSizeCapacityLabel,
} from "@/lib/constants/parcel";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface TripInfoRowProps {
  transportMode: string;
  parcelSizeCapacity: string;
  capacityLabel?: string; // defaults to "Parcel Size", pass "Trip Capacity" where needed
}

export default function TripInfoRow({
  transportMode,
  parcelSizeCapacity,
  capacityLabel = "Parcel Size",
}: TripInfoRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.infoRow}>
      {/* Transport */}
      <View style={styles.infoItem}>
        <View
          style={[styles.infoIcon, { backgroundColor: colors.primary + "10" }]}
        >
          <Ionicons
            name={
              TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ??
              "car-outline"
            }
            size={18}
            color={colors.primary}
          />
        </View>
        <View>
          <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
            Transport
          </Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>
            {transportMode
              ? transportMode.charAt(0).toUpperCase() + transportMode.slice(1)
              : "—"}
          </Text>
        </View>
      </View>

      {/* Parcel Size / Trip Capacity */}
      <View style={styles.infoItem}>
        <View
          style={[styles.infoIcon, { backgroundColor: colors.success + "10" }]}
        >
          <Ionicons
            name={getSizeCapacityIcon(parcelSizeCapacity || "small")}
            size={18}
            color={colors.success}
          />
        </View>
        <View>
          <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
            {capacityLabel}
          </Text>
          <Text style={[styles.infoValue, { color: colors.text.primary }]}>
            {getSizeCapacityLabel(parcelSizeCapacity)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
