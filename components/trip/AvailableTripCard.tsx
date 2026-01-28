import { TRANSPORT_CONFIG, UI } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { capitalize } from "@/lib/utils/string";
import { Trip } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography, withOpacity } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AvailableTripCardProps {
  trip: Trip;
}

export default function AvailableTripCard({ trip }: AvailableTripCardProps) {
  const colors = useThemeColors();

  const handlePress = () => {
    haptics.light();
    router.push({
      pathname: "/(tabs)/explore/trip-preview",
      params: { id: trip.id },
    });
  };

  // Render slot dots (max 5)
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.primary,
          borderColor: colors.border.default,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {/* Transport Mode Header */}
      <View
        style={[
          styles.transportHeader,
          { backgroundColor: withOpacity(colors.primary, "subtle") },
        ]}
      >
        <View
          style={[styles.transportBadge, { backgroundColor: colors.primary }]}
        >
          <Ionicons
            name={TRANSPORT_CONFIG[trip.transport_mode].icon}
            size={20}
            color={colors.text.inverse}
          />
        </View>
        <Text style={[styles.transportLabel, { color: colors.primary }]}>
          {TRANSPORT_CONFIG[trip.transport_mode].label}
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
            Departure
          </Text>
          <View style={styles.dateTimeRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text.primary }]}>
                {formatDate(trip.departure_date)}
              </Text>
            </View>
            <View
              style={[
                styles.separator,
                { backgroundColor: colors.border.light },
              ]}
            />
            <View style={styles.infoItem}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text.primary }]}>
                {formatTime(trip.departure_time)}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View
          style={[styles.divider, { backgroundColor: colors.border.light }]}
        />

        {/* Slots Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
            Available Slots
          </Text>
          <View style={styles.slotsContainer}>
            <View style={styles.slotsRow}>{renderSlots()}</View>
            <Text style={[styles.slotsCount, { color: colors.text.primary }]}>
              {trip.available_slots} of {trip.total_slots} slots
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={[styles.divider, { backgroundColor: colors.border.light }]}
        />

        {/* Allowed Items Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
            Allowed Items
          </Text>
          <View style={styles.categoriesRow}>
            {trip.allowed_categories
              .slice(0, UI.MAX_VISIBLE_CATEGORIES)
              .map((cat) => (
                <View
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: withOpacity(colors.primary, "subtle") },
                  ]}
                >
                  <Text
                    style={[styles.categoryText, { color: colors.primary }]}
                  >
                    {capitalize(cat)}
                  </Text>
                </View>
              ))}
            {trip.allowed_categories.length > UI.MAX_VISIBLE_CATEGORIES && (
              <View
                style={[
                  styles.categoryChip,
                  { backgroundColor: withOpacity(colors.primary, "subtle") },
                ]}
              >
                <Text style={[styles.categoryText, { color: colors.primary }]}>
                  +{trip.allowed_categories.length - UI.MAX_VISIBLE_CATEGORIES}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* View Details Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border.light }]}>
        <Text style={[styles.footerText, { color: colors.primary }]}>
          View Full Details
        </Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  transportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  transportBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  transportLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  infoText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: Spacing.sm,
  },
  divider: {
    height: 1,
  },
  slotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  slotsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  slotDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  slotsCount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryChip: {
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
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
});
