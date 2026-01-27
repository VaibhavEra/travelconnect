import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { haptics } from "@/lib/utils/haptics";
import { Trip } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
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

type TripStatus = "open" | "in_progress" | "completed" | "cancelled";

const TRANSPORT_ICONS: Record<
  Trip["transport_mode"],
  keyof typeof Ionicons.glyphMap
> = {
  train: "train",
  bus: "bus",
  flight: "airplane",
  car: "car",
};

const STATUS_CONFIG: Record<
  TripStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    getColor: (colors: any) => string;
  }
> = {
  open: {
    label: "Open",
    icon: "checkmark-circle",
    getColor: (colors) => colors.success,
  },
  in_progress: {
    label: "In Progress",
    icon: "time",
    getColor: (colors) => colors.warning,
  },
  completed: {
    label: "Completed",
    icon: "checkmark-done-circle",
    getColor: (colors) => colors.success,
  },
  cancelled: {
    label: "Cancelled",
    icon: "close-circle",
    getColor: (colors) => colors.error,
  },
};

export default function TripCard({ trip }: TripCardProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isUpcoming = () => {
    const now = new Date();
    const departureDateTime = new Date(
      `${trip.departure_date}T${trip.departure_time}`,
    );
    return departureDateTime > now && trip.status === "open";
  };

  const renderSlots = () => {
    const slots = [];
    const maxSlots = Math.min(trip.total_slots, 5);

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
                : colors.text.tertiary + "40",
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
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const status = trip.status as TripStatus;
  const statusConfig = STATUS_CONFIG[status];
  const statusColor = statusConfig.getColor(colors);
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
          style={[styles.statusBanner, { backgroundColor: statusColor + "15" }]}
        >
          <Ionicons name={statusConfig.icon} size={16} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
          {isUpcoming() && (
            <>
              <View
                style={[
                  styles.separator,
                  { backgroundColor: statusColor + "30" },
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
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name={TRANSPORT_ICONS[trip.transport_mode]}
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
            {/* Slots with Dots */}
            <View style={styles.slotsContainer}>
              <View style={styles.slotsRow}>{renderSlots()}</View>
              <Text
                style={[styles.slotsText, { color: colors.text.secondary }]}
              >
                {trip.available_slots}/{trip.total_slots} slots
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              {trip.allowed_categories.slice(0, 3).map((category) => {
                const config =
                  CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <Ionicons
                    key={category}
                    name={config?.icon || "cube"}
                    size={14}
                    color={colors.text.tertiary}
                  />
                );
              })}
              {trip.allowed_categories.length > 3 && (
                <Text
                  style={[
                    styles.moreCategoriesText,
                    { color: colors.text.tertiary },
                  ]}
                >
                  +{trip.allowed_categories.length - 3}
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
