import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import {
  getSizeCapacityIcon,
  getSizeCapacityLabel,
} from "@/lib/constants/parcel";
import { TRIP_STATUS_CONFIG, TripStatus } from "@/lib/constants/status";
import { TRANSPORT_CONFIG } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
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

          {/* Info Row - Parcel Size + Categories */}
          <View style={styles.infoRow}>
            {/* Parcel Size */}
            <View style={styles.sizeContainer}>
              <View
                style={[
                  styles.sizeChip,
                  { backgroundColor: withOpacity(colors.success, "subtle") },
                ]}
              >
                <Ionicons
                  name={getSizeCapacityIcon(trip.parcel_size_capacity)}
                  size={14}
                  color={colors.success}
                />
                <Text style={[styles.sizeText, { color: colors.success }]}>
                  {getSizeCapacityLabel(trip.parcel_size_capacity)}
                </Text>
              </View>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              {trip.allowed_categories.slice(0, 2).map((category) => {
                const config =
                  CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <View
                    key={category}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: withOpacity(colors.primary, "subtle"),
                      },
                    ]}
                  >
                    <Ionicons
                      name={config?.icon || "cube"}
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.categoryText, { color: colors.primary }]}
                    >
                      {config?.label || category}
                    </Text>
                  </View>
                );
              })}
              {trip.allowed_categories.length > 2 && (
                <View
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: withOpacity(colors.primary, "subtle"),
                    },
                  ]}
                >
                  <Text
                    style={[styles.categoryText, { color: colors.primary }]}
                  >
                    +{trip.allowed_categories.length - 2}
                  </Text>
                </View>
              )}
            </View>
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
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
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
