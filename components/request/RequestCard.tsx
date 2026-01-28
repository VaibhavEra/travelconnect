import {
  REQUEST_STATUS_CONFIG,
  RequestStatus,
  TRANSPORT_CONFIG,
  TransportMode,
} from "@/lib/constants";

import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { ParcelRequest } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const scale = useSharedValue(1);

  const handlePress = () => {
    haptics.light();
    router.push(`/my-requests/${request.id}` as any);
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = request.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  const isCancelled =
    request.status === "cancelled" || request.status === "rejected";

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];
  const sizeConfig = SIZE_CONFIG[request.size as keyof typeof SIZE_CONFIG];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.background.secondary,
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

        {/* Route Section */}
        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={styles.cityContainer}>
              <Text style={[styles.cityName, { color: colors.text.primary }]}>
                {request.trip?.source}
              </Text>
            </View>

            <View style={styles.routeMiddle}>
              <View
                style={[
                  styles.routeLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
              {request.trip?.transport_mode && (
                <View
                  style={[
                    styles.transportIcon,
                    { backgroundColor: withOpacity(colors.primary, "light") },
                  ]}
                >
                  <Ionicons
                    name={
                      TRANSPORT_CONFIG[
                        request.trip.transport_mode as TransportMode
                      ]?.icon || "arrow-forward"
                    }
                    size={16}
                    color={colors.primary}
                  />
                </View>
              )}
              <View
                style={[
                  styles.routeLine,
                  { backgroundColor: colors.border.default },
                ]}
              />
            </View>

            <View style={[styles.cityContainer, { alignItems: "flex-end" }]}>
              <Text style={[styles.cityName, { color: colors.text.primary }]}>
                {request.trip?.destination}
              </Text>
            </View>
          </View>

          {/* Departure & Arrival Details */}
          {request.trip && (
            <View style={styles.tripTimings}>
              <View style={styles.timingItem}>
                <Ionicons
                  name="log-out-outline"
                  size={14}
                  color={colors.text.tertiary}
                />
                <Text
                  style={[styles.timingText, { color: colors.text.tertiary }]}
                >
                  {formatDate(request.trip.departure_date)} •{" "}
                  {formatTime(request.trip.departure_time)}
                </Text>
              </View>
              {(request.trip as any).arrival_date &&
                (request.trip as any).arrival_time && (
                  <View style={styles.timingItem}>
                    <Ionicons
                      name="log-in-outline"
                      size={14}
                      color={colors.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.timingText,
                        { color: colors.text.tertiary },
                      ]}
                    >
                      {formatDate((request.trip as any).arrival_date)} •{" "}
                      {formatTime((request.trip as any).arrival_time)}
                    </Text>
                  </View>
                )}
            </View>
          )}
        </View>

        {/* Divider */}
        <View
          style={[styles.divider, { backgroundColor: colors.border.light }]}
        />

        {/* Parcel Details - Separated */}
        <View style={styles.detailsSection}>
          {/* Size */}
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
              Size
            </Text>
            <View
              style={[
                styles.detailChip,
                { backgroundColor: withOpacity(colors.primary, "subtle") },
              ]}
            >
              <Ionicons
                name={sizeConfig.icon}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.detailChipText, { color: colors.primary }]}>
                {sizeConfig.label}
              </Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>
              Category
            </Text>
            <View
              style={[
                styles.detailChip,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <Ionicons
                name={categoryConfig.icon}
                size={16}
                color={colors.text.secondary}
              />
              <Text
                style={[
                  styles.detailChipText,
                  { color: colors.text.secondary },
                ]}
              >
                {categoryConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            View Details
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.text.tertiary}
          />
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
  routeSection: {
    padding: Spacing.lg,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cityContainer: {
    flex: 1,
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
    width: 24,
    height: 2,
  },
  transportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -8,
  },
  tripTimings: {
    gap: Spacing.xs,
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  timingText: {
    fontSize: Typography.sizes.xs,
  },
  divider: {
    height: 1,
  },
  detailsSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  detailItem: {
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  detailChipText: {
    fontSize: Typography.sizes.sm,
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
    fontWeight: Typography.weights.medium,
  },
});
