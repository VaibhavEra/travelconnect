import { Trip, useTripStore } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentTrip, loading, getTripById, updateTripStatus, deleteTrip } =
    useTripStore();
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleCompleteTrip = () => {
    Alert.alert(
      "Complete Trip",
      "Mark this trip as completed? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            try {
              setActionLoading(true);
              await updateTripStatus(id, "completed");
              Alert.alert("Success", "Trip marked as completed");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to complete trip");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelTrip = () => {
    Alert.alert(
      "Cancel Trip",
      "Are you sure you want to cancel this trip? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteTrip(id);
              Alert.alert("Success", "Trip cancelled");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel trip");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleViewTicket = () => {
    if (currentTrip?.ticket_file_url) {
      Linking.openURL(currentTrip.ticket_file_url);
    }
  };

  if (loading || !currentTrip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const canPerformActions =
    currentTrip.status === "open" || currentTrip.status === "in_progress";

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

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[currentTrip.status] + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[currentTrip.status] },
            ]}
          >
            {STATUS_LABELS[currentTrip.status]}
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

            <View style={styles.infoItem}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={Colors.text.secondary}
              />
              <View>
                <Text style={styles.infoLabel}>PNR Number</Text>
                <Text style={styles.infoValue}>{currentTrip.pnr_number}</Text>
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
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{currentTrip.notes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket</Text>
          <Pressable style={styles.ticketButton} onPress={handleViewTicket}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.ticketButtonText}>View Ticket File</Text>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parcel Requests</Text>
          <View style={styles.emptyState}>
            <Ionicons
              name="cube-outline"
              size={48}
              color={Colors.text.tertiary}
            />
            <Text style={styles.emptyStateText}>No parcel requests yet</Text>
          </View>
        </View>

        {canPerformActions && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteTrip}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={Colors.text.inverse}
                  />
                  <Text style={styles.actionButtonText}>Complete Trip</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelTrip}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={Colors.error} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color={Colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.cancelButtonText]}
                  >
                    Cancel Trip
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
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
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary + "10",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  cancelButton: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
  cancelButtonText: {
    color: Colors.error,
  },
});
