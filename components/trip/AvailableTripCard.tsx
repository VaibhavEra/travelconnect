import { Trip } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AvailableTripCardProps {
  trip: Trip;
  onRequestParcel?: () => void;
}

const TRANSPORT_ICONS: Record<
  Trip["transport_mode"],
  keyof typeof Ionicons.glyphMap
> = {
  train: "train",
  bus: "bus",
  flight: "airplane",
  car: "car",
};

export default function AvailableTripCard({
  trip,
  onRequestParcel,
}: AvailableTripCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
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

  const handleViewDetails = () => {
    router.push({
      pathname: "/trip-preview/[id]", // Changed from /trip/[id]
      params: { id: trip.id },
    });
  };

  const handleRequest = (e: any) => {
    e.stopPropagation();
    if (onRequestParcel) {
      onRequestParcel();
    }
  };

  return (
    <Pressable style={styles.card} onPress={handleViewDetails}>
      <View style={styles.header}>
        <View style={styles.routeInfo}>
          <Text style={styles.cityText}>{trip.source}</Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={Colors.text.secondary}
          />
          <Text style={styles.cityText}>{trip.destination}</Text>
        </View>
        <View style={styles.slotsIndicator}>
          <Ionicons name="cube" size={16} color={Colors.success} />
          <Text style={styles.slotsText}>
            {trip.available_slots}/{trip.total_slots}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons
            name={TRANSPORT_ICONS[trip.transport_mode]}
            size={16}
            color={Colors.text.secondary}
          />
          <Text style={styles.detailText}>
            {trip.transport_mode.charAt(0).toUpperCase() +
              trip.transport_mode.slice(1)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {formatDate(trip.departure_date)} at{" "}
            {formatTime(trip.departure_time)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.categoriesPreview}>
          {trip.allowed_categories.slice(0, 3).map((cat) => (
            <View key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryText}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </View>
          ))}
          {trip.allowed_categories.length > 3 && (
            <Text style={styles.moreCategories}>
              +{trip.allowed_categories.length - 3} more
            </Text>
          )}
        </View>

        <Pressable style={styles.requestButton} onPress={handleRequest}>
          <Text style={styles.requestButtonText}>Request</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  cityText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  slotsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.success + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  slotsText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
  },
  details: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  categoriesPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  moreCategories: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  requestButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
});
