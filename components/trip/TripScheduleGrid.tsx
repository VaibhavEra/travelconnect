import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface TripScheduleGridProps {
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
}

export default function TripScheduleGrid({
  departureDate,
  departureTime,
  arrivalDate,
  arrivalTime,
}: TripScheduleGridProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.scheduleGrid}>
      {/* Departure */}
      <View style={styles.scheduleBlock}>
        <View
          style={[
            styles.scheduleIconContainer,
            { backgroundColor: colors.primary + "10" },
          ]}
        >
          <Ionicons name="arrow-up-circle" size={20} color={colors.primary} />
        </View>
        <View style={styles.scheduleDetails}>
          <Text style={[styles.scheduleLabel, { color: colors.text.tertiary }]}>
            Departure
          </Text>
          <Text style={[styles.scheduleDate, { color: colors.text.primary }]}>
            {formatDate(departureDate)}
          </Text>
          <Text style={[styles.scheduleTime, { color: colors.text.secondary }]}>
            {formatTime(departureTime)}
          </Text>
        </View>
      </View>

      {/* Arrival */}
      <View style={styles.scheduleBlock}>
        <View
          style={[
            styles.scheduleIconContainer,
            { backgroundColor: colors.success + "10" },
          ]}
        >
          <Ionicons name="arrow-down-circle" size={20} color={colors.success} />
        </View>
        <View style={styles.scheduleDetails}>
          <Text style={[styles.scheduleLabel, { color: colors.text.tertiary }]}>
            Arrival
          </Text>
          <Text style={[styles.scheduleDate, { color: colors.text.primary }]}>
            {formatDate(arrivalDate)}
          </Text>
          <Text style={[styles.scheduleTime, { color: colors.text.secondary }]}>
            {formatTime(arrivalTime)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  scheduleBlock: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  scheduleDate: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: Typography.sizes.xs,
  },
});
