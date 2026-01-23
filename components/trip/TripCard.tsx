import { Trip } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TripCardProps {
  trip: Trip;
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

const STATUS_COLORS: Record<Trip["status"], string> = {
  open: Colors.success,
  in_progress: Colors.warning,
  completed: Colors.text.tertiary,
  cancelled: Colors.error,
};

const STATUS_LABELS: Record<Trip["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function TripCard({ trip }: TripCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    return d.toLocaleDateString("en-US", options);
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

  const handlePress = () => {
    router.push({
      pathname: "/trip/[id]",
      params: { id: trip.id },
    });
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <View style={styles.route}>
          <Text style={styles.cityText}>{trip.source}</Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={Colors.text.secondary}
          />
          <Text style={styles.cityText}>{trip.destination}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[trip.status] + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: STATUS_COLORS[trip.status] }]}
          >
            {STATUS_LABELS[trip.status]}
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

        <View style={styles.detailRow}>
          <Ionicons name="cube" size={16} color={Colors.text.secondary} />
          <Text style={styles.detailText}>
            {trip.available_slots}/{trip.total_slots} slots available
          </Text>
        </View>
      </View>

      {isUpcoming() && (
        <View style={styles.upcomingBadge}>
          <Ionicons name="time" size={12} color={Colors.primary} />
          <Text style={styles.upcomingText}>Upcoming</Text>
        </View>
      )}
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
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  route: {
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  details: {
    gap: Spacing.xs,
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
  upcomingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  upcomingText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
});
