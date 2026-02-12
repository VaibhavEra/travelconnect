import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { getSizeCapacityLabel } from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_CONFIG } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { ParcelRequest } from "@/stores/requestStore";
import {
  Animations,
  BorderRadius,
  Spacing,
  Typography,
  withOpacity,
} from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface RequestCardProps {
  request: ParcelRequest;
}

export default function RequestCard({ request }: RequestCardProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const handlePress = () => {
    haptics.light();
    router.push({
      pathname: "/(tabs)/my-requests/[id]",
      params: { id: request.id },
    });
  };

  const handlePressIn = () => {
    scale.value = withSpring(Animations.scale.card);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = request.status as RequestStatus;
  const statusConfig =
    REQUEST_STATUS_CONFIG[status] || REQUEST_STATUS_CONFIG.pending;
  const statusColor = colors[statusConfig.colorKey];

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];

  const isCancelled = request.status === "cancelled";

  const transportMode = request.trip
    ?.transport_mode as keyof typeof TRANSPORT_CONFIG;
  const transportConfig = transportMode
    ? TRANSPORT_CONFIG[transportMode]
    : null;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.background.primary,
            borderColor: colors.border.default,
          },
          isCancelled && { opacity: 0.7 },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: withOpacity(statusColor, "light") },
          ]}
        >
          <Ionicons name={statusConfig.icon} size={16} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Cities Row */}
          {request.trip && (
            <View style={styles.citiesRow}>
              <View style={styles.cityColumn}>
                <Text style={[styles.cityName, { color: colors.text.primary }]}>
                  {request.trip.source}
                </Text>
                <Text
                  style={[styles.dateTime, { color: colors.text.secondary }]}
                >
                  {formatDate(request.trip.departure_date)}
                </Text>
                <Text
                  style={[styles.dateTime, { color: colors.text.secondary }]}
                >
                  {formatTime(request.trip.departure_time)}
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
                    { backgroundColor: withOpacity(colors.primary, "light") },
                  ]}
                >
                  <Ionicons
                    name={transportConfig?.icon || "arrow-forward"}
                    size={18}
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

              <View style={[styles.cityColumn, { alignItems: "flex-end" }]}>
                <Text style={[styles.cityName, { color: colors.text.primary }]}>
                  {request.trip.destination}
                </Text>
                <Text
                  style={[styles.dateTime, { color: colors.text.secondary }]}
                >
                  {formatDate(request.trip.arrival_date)}
                </Text>
                <Text
                  style={[styles.dateTime, { color: colors.text.secondary }]}
                >
                  {formatTime(request.trip.arrival_time)}
                </Text>
              </View>
            </View>
          )}

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Info Row - Category + Parcel Size */}
          <View style={styles.infoRow}>
            {/* Category */}
            <View style={styles.categoryContainer}>
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: withOpacity(colors.primary, "subtle") },
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

            {/* Trip Parcel Size Capacity */}
            {request.trip?.parcel_size_capacity && (
              <View style={styles.sizeContainer}>
                <View
                  style={[
                    styles.sizeChip,
                    { backgroundColor: withOpacity(colors.success, "subtle") },
                  ]}
                >
                  <Ionicons name="cube" size={14} color={colors.success} />
                  <Text style={[styles.sizeText, { color: colors.success }]}>
                    {getSizeCapacityLabel(request.trip.parcel_size_capacity)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
          <Text style={[styles.footerText, { color: colors.primary }]}>
            View Full Details
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  content: {
    padding: Spacing.lg,
  },
  citiesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cityColumn: {
    flex: 1,
    gap: 2,
  },
  cityName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  dateTime: {
    fontSize: Typography.sizes.xs,
  },
  routeMiddle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  routeLine: {
    width: 28,
    height: 2,
  },
  transportIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -10,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryContainer: {},
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  sizeContainer: {},
  sizeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sizeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
