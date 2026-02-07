import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface RequestCardProps {
  request: ParcelRequest;
}

export default function RequestCard({ request }: RequestCardProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    haptics.light();
    router.push({
      pathname: "/(tabs)/my-requests/[id]",
      params: { id: request.id },
    });
  };

  const status = request.status as RequestStatus;
  const statusConfig =
    REQUEST_STATUS_CONFIG[status] || REQUEST_STATUS_CONFIG.pending;
  const statusColor = colors[statusConfig.colorKey];

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];

  // Get transport icon safely
  const transportMode = request.trip?.transport_mode || "";
  const transportIcon =
    TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ||
    "arrow-forward";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.secondary,
          borderColor: colors.border.default,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {/* Header - Status and Route */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Route */}
      {request.trip && (
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={styles.cityContainer}>
              <Text style={[styles.cityLabel, { color: colors.text.tertiary }]}>
                From
              </Text>
              <Text style={[styles.cityName, { color: colors.text.primary }]}>
                {request.trip.source}
              </Text>
            </View>

            <View style={styles.routeMiddle}>
              <View
                style={[
                  styles.routeLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
              <View
                style={[
                  styles.transportIcon,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name={transportIcon}
                  size={14}
                  color={colors.primary}
                />
              </View>
              <View
                style={[
                  styles.routeLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
            </View>

            <View style={[styles.cityContainer, { alignItems: "flex-end" }]}>
              <Text style={[styles.cityLabel, { color: colors.text.tertiary }]}>
                To
              </Text>
              <Text style={[styles.cityName, { color: colors.text.primary }]}>
                {request.trip.destination}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Divider */}
      <View
        style={[styles.divider, { backgroundColor: colors.border.light }]}
      />

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        {/* Category */}
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
            Category
          </Text>
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: colors.primary + "10" },
            ]}
          >
            <Ionicons
              name={categoryConfig.icon}
              size={14}
              color={colors.primary}
            />
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {categoryConfig.label}
            </Text>
          </View>
        </View>

        {/* Parcel Size Capacity (from trip) */}
        {request.trip?.parcel_size_capacity && (
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
              Trip Accepts
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {getSizeCapacityLabel(request.trip.parcel_size_capacity)}
            </Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View
        style={[styles.divider, { backgroundColor: colors.border.light }]}
      />

      {/* Departure Info */}
      {request.trip && (
        <View style={styles.timingRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.text.tertiary}
          />
          <View style={styles.timingDetails}>
            <Text style={[styles.timingLabel, { color: colors.text.tertiary }]}>
              Departure
            </Text>
            <Text style={[styles.timingValue, { color: colors.text.primary }]}>
              {formatDate(request.trip.departure_date)} •{" "}
              {formatTime(request.trip.departure_time)}
            </Text>
          </View>
        </View>
      )}

      {/* Footer - View Details */}
      <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
        <Text style={[styles.footerText, { color: colors.primary }]}>
          View Details
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  routeContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityContainer: {
    flex: 1,
  },
  cityLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  cityName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  routeMiddle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  routeLine: {
    flex: 1,
    height: 2,
  },
  transportIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailItem: {
    flex: 1,
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  timingDetails: {
    flex: 1,
  },
  timingLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  timingValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
