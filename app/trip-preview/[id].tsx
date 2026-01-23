import { Trip, useTripStore } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const TRANSPORT_ICONS: Record<
  Trip["transport_mode"],
  keyof typeof Ionicons.glyphMap
> = {
  train: "train",
  bus: "bus",
  flight: "airplane",
  car: "car",
};

export default function TripPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentTrip, loading, getTripById } = useTripStore();

  useEffect(() => {
    if (id) {
      getTripById(id);
    }
  }, [id]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
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

  const handleRequestParcel = () => {
    // Will implement in Phase 7
    console.log("Request parcel for trip:", id);
    // TODO: Navigate to parcel request form
  };

  if (loading || !currentTrip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Trip Details</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.availabilityBadge}>
          <Ionicons name="cube" size={20} color={Colors.success} />
          <Text style={styles.availabilityText}>
            {currentTrip.available_slots} slot(s) available
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeContainer}>
            <View style={styles.locationItem}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{currentTrip.source}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.locationDotEnd]} />
              <Text style={styles.locationText}>{currentTrip.destination}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.scheduleContainer}>
            <View style={styles.scheduleItem}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.text.secondary}
              />
              <View style={styles.scheduleDetails}>
                <Text style={styles.scheduleLabel}>Departure</Text>
                <Text style={styles.scheduleValue}>
                  {formatDate(currentTrip.departure_date)}
                </Text>
                <Text style={styles.scheduleTime}>
                  {formatTime(currentTrip.departure_time)}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleDivider} />

            <View style={styles.scheduleItem}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.text.secondary}
              />
              <View style={styles.scheduleDetails}>
                <Text style={styles.scheduleLabel}>Arrival</Text>
                <Text style={styles.scheduleValue}>
                  {formatDate(currentTrip.arrival_date)}
                </Text>
                <Text style={styles.scheduleTime}>
                  {formatTime(currentTrip.arrival_time)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons
                name={TRANSPORT_ICONS[currentTrip.transport_mode]}
                size={20}
                color={Colors.text.secondary}
              />
              <View>
                <Text style={styles.infoLabel}>Transport</Text>
                <Text style={styles.infoValue}>
                  {currentTrip.transport_mode.charAt(0).toUpperCase() +
                    currentTrip.transport_mode.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons
                name="cube-outline"
                size={20}
                color={Colors.text.secondary}
              />
              <View>
                <Text style={styles.infoLabel}>Available Slots</Text>
                <Text style={styles.infoValue}>
                  {currentTrip.available_slots}/{currentTrip.total_slots}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allowed Categories</Text>
          <View style={styles.categoriesContainer}>
            {currentTrip.allowed_categories.map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryText}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {currentTrip.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traveller's Notes</Text>
            <Text style={styles.notesText}>{currentTrip.notes}</Text>
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.requestButton} onPress={handleRequestParcel}>
          <Ionicons name="add-circle" size={24} color={Colors.text.inverse} />
          <Text style={styles.requestButtonText}>Request Parcel Delivery</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: Colors.success + "20",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  availabilityText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
  },
  section: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  routeContainer: {
    gap: Spacing.sm,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  locationDotEnd: {
    backgroundColor: Colors.success,
  },
  locationText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border.default,
    marginLeft: 5,
  },
  scheduleContainer: {
    gap: Spacing.md,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  scheduleValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  scheduleTime: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginTop: 2,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryChip: {
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  requestButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
});
