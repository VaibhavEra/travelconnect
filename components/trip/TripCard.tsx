import {
  TRANSPORT_CONFIG,
  TRIP_STATUS_CONFIG,
  TripStatus,
  UI,
} from "@/lib/constants";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { formatDate, formatTime, isFuture } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { Trip } from "@/stores/tripStore";
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

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  // FIXED: Use isFuture like before
  const isUpcoming =
    isFuture(trip.departure_date, trip.departure_time) &&
    trip.status === "upcoming";

  const renderSlots = () => {
    const slots = [];
    const maxSlots = Math.min(trip.total_slots, UI.MAX_VISIBLE_SLOTS);

    for (let i = 0; i < maxSlots; i++) {
      const isAvailable = i < trip.available_slots;
      slots.push(
        <View
          key={i}
          style={[
            styles.slotDot,
            {
              backgroundColor: isAvailable
                ? colors.success
                : withOpacity(colors.text.tertiary, "strong"),
            },
          ]}
        />,
      );
    }
    return slots;
  };

  const handlePress = () => {
    haptics.light();
    router.push(`/(tabs)/my-trips/${trip.id}`);
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

  const status = trip.status as TripStatus;
  const statusConfig = TRIP_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];
  const isCancelled = trip.status === "cancelled";

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
          {/* FIXED: Only show "Upcoming" if trip is in future and not already showing upcoming status */}
          {isUpcoming && (
            <>
              <View
                style={[
                  styles.separator,
                  { backgroundColor: withOpacity(statusColor, "medium") },
                ]}
              />
              <Ionicons name="time" size={14} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                Upcoming
              </Text>
            </>
          )}
        </View>

        {/* Route Section */}
        <View style={styles.content}>
          {/* Cities Row */}
          <View style={styles.citiesRow}>
            <View style={styles.cityColumn}>
              <Text style={[styles.cityName, { color: colors.text.primary }]}>
                {trip.source}
              </Text>
              <Text style={[styles.dateTime, { color: colors.text.secondary }]}>
                {formatDate(trip.departure_date)}
              </Text>
              <Text style={[styles.dateTime, { color: colors.text.secondary }]}>
                {formatTime(trip.departure_time)}
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
                  name={TRANSPORT_CONFIG[trip.transport_mode].icon}
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
                {trip.destination}
              </Text>
              <Text style={[styles.dateTime, { color: colors.text.secondary }]}>
                {formatDate(trip.arrival_date)}
              </Text>
              <Text style={[styles.dateTime, { color: colors.text.secondary }]}>
                {formatTime(trip.arrival_time)}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Info Row */}
          <View style={styles.infoRow}>
            {/* Slots with proper label */}
            <View style={styles.slotsContainer}>
              <View style={styles.slotsRow}>{renderSlots()}</View>
              <Text
                style={[styles.slotsText, { color: colors.text.secondary }]}
              >
                {trip.available_slots}/{trip.total_slots}{" "}
                {trip.total_slots === 1 ? "slot" : "slots"}
              </Text>
            </View>

            {/* Categories with icons AND labels */}
            <View style={styles.categoriesContainer}>
              {trip.allowed_categories
                .slice(0, UI.MAX_VISIBLE_CATEGORIES)
                .map((category) => {
                  const config =
                    CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                  return (
                    <View key={category} style={styles.categoryItem}>
                      <Ionicons
                        name={config?.icon || "cube"}
                        size={14}
                        color={colors.text.tertiary}
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: colors.text.tertiary },
                        ]}
                      >
                        {config?.label || category}
                      </Text>
                    </View>
                  );
                })}
              {trip.allowed_categories.length > UI.MAX_VISIBLE_CATEGORIES && (
                <Text
                  style={[
                    styles.moreCategoriesText,
                    { color: colors.text.tertiary },
                  ]}
                >
                  +{trip.allowed_categories.length - UI.MAX_VISIBLE_CATEGORIES}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            View Details
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
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
  separator: {
    width: 1,
    height: 14,
    marginHorizontal: Spacing.xs,
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
  slotsContainer: {
    gap: 4,
  },
  slotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotsText: {
    fontSize: Typography.sizes.xs,
  },
  categoriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  categoryLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  moreCategoriesText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});
