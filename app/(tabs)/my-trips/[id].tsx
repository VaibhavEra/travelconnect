import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { haptics } from "@/lib/utils/haptics";
import { Trip, useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
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
import { SafeAreaView } from "react-native-safe-area-context";

const TRANSPORT_ICONS: Record<
  Trip["transport_mode"],
  keyof typeof Ionicons.glyphMap
> = {
  train: "train",
  bus: "bus",
  flight: "airplane",
  car: "car",
};

type TripStatus = "open" | "in_progress" | "completed" | "cancelled";

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

export default function TripDetailsScreen() {
  const colors = useThemeColors();
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderSlots = () => {
    const slots = [];
    const maxSlots = Math.min(currentTrip!.total_slots, 5);

    for (let i = 0; i < maxSlots; i++) {
      const isAvailable = i < currentTrip!.available_slots;
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

  const handleCompleteTrip = () => {
    haptics.light();
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
              haptics.success();
              await updateTripStatus(id, "completed");
              Alert.alert("Success", "Trip marked as completed");
              router.back();
            } catch (error) {
              haptics.error();
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
    haptics.light();
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
              haptics.success();
              await deleteTrip(id);
              Alert.alert("Success", "Trip cancelled");
              router.back();
            } catch (error) {
              haptics.error();
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
    haptics.light();
    if (currentTrip?.ticket_file_url) {
      Linking.openURL(currentTrip.ticket_file_url);
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  if (loading || !currentTrip) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = currentTrip.status as TripStatus;
  const statusConfig = STATUS_CONFIG[status];
  const statusColor = statusConfig.getColor(colors);
  const canPerformActions = status === "open" || status === "in_progress";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          style={[
            styles.backButton,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Trip Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}
        >
          <Ionicons name={statusConfig.icon} size={18} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Main Card */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View
                style={[styles.routeDot, { backgroundColor: colors.primary }]}
              />
              <View style={styles.routeInfo}>
                <Text
                  style={[styles.routeLabel, { color: colors.text.tertiary }]}
                >
                  From
                </Text>
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {currentTrip.source}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.routeConnector,
                { borderColor: colors.border.default },
              ]}
            />

            <View style={styles.routePoint}>
              <View
                style={[styles.routeDot, { backgroundColor: colors.success }]}
              />
              <View style={styles.routeInfo}>
                <Text
                  style={[styles.routeLabel, { color: colors.text.tertiary }]}
                >
                  To
                </Text>
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {currentTrip.destination}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Schedule Grid */}
          <View style={styles.scheduleGrid}>
            {/* Departure */}
            <View style={styles.scheduleBlock}>
              <View
                style={[
                  styles.scheduleIconContainer,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.scheduleDetails}>
                <Text
                  style={[
                    styles.scheduleLabel,
                    { color: colors.text.tertiary },
                  ]}
                >
                  Departure
                </Text>
                <Text
                  style={[styles.scheduleDate, { color: colors.text.primary }]}
                >
                  {formatDate(currentTrip.departure_date)}
                </Text>
                <Text
                  style={[
                    styles.scheduleTime,
                    { color: colors.text.secondary },
                  ]}
                >
                  {formatTime(currentTrip.departure_time)}
                </Text>
              </View>
            </View>

            {/* Arrival */}
            <View style={styles.scheduleBlock}>
              <View
                style={[
                  styles.scheduleIconContainer,
                  { backgroundColor: colors.success + "10" },
                ]}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={colors.success}
                />
              </View>
              <View style={styles.scheduleDetails}>
                <Text
                  style={[
                    styles.scheduleLabel,
                    { color: colors.text.tertiary },
                  ]}
                >
                  Arrival
                </Text>
                <Text
                  style={[styles.scheduleDate, { color: colors.text.primary }]}
                >
                  {formatDate(currentTrip.arrival_date)}
                </Text>
                <Text
                  style={[
                    styles.scheduleTime,
                    { color: colors.text.secondary },
                  ]}
                >
                  {formatTime(currentTrip.arrival_time)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Trip Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name={TRANSPORT_ICONS[currentTrip.transport_mode]}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text
                  style={[styles.infoLabel, { color: colors.text.tertiary }]}
                >
                  Transport
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.text.primary }]}
                >
                  {currentTrip.transport_mode.charAt(0).toUpperCase() +
                    currentTrip.transport_mode.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: colors.success + "10" },
                ]}
              >
                <Ionicons name="cube" size={18} color={colors.success} />
              </View>
              <View>
                <Text
                  style={[styles.infoLabel, { color: colors.text.tertiary }]}
                >
                  Available Slots
                </Text>
                <View style={styles.slotsInfo}>
                  <View style={styles.slotsRow}>{renderSlots()}</View>
                  <Text
                    style={[styles.slotsCount, { color: colors.text.primary }]}
                  >
                    {currentTrip.available_slots}/{currentTrip.total_slots}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* PNR Number */}
          <View style={styles.pnrSection}>
            <Text style={[styles.pnrLabel, { color: colors.text.tertiary }]}>
              PNR Number
            </Text>
            <Text style={[styles.pnrValue, { color: colors.text.primary }]}>
              {currentTrip.pnr_number}
            </Text>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <Text
              style={[styles.categoriesTitle, { color: colors.text.primary }]}
            >
              Allowed Categories
            </Text>
            <View style={styles.categoriesGrid}>
              {currentTrip.allowed_categories.map((category) => {
                const config =
                  CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <View
                    key={category}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.primary + "10" },
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
            </View>
          </View>

          {/* Notes */}
          {currentTrip.notes && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border.light },
                ]}
              />
              <View style={styles.notesSection}>
                <Text
                  style={[styles.notesTitle, { color: colors.text.primary }]}
                >
                  Additional Notes
                </Text>
                <Text
                  style={[styles.notesText, { color: colors.text.secondary }]}
                >
                  {currentTrip.notes}
                </Text>
              </View>
            </>
          )}

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Ticket */}
          <View style={styles.ticketSection}>
            <Text style={[styles.ticketTitle, { color: colors.text.primary }]}>
              Travel Ticket
            </Text>
            <Pressable
              style={[
                styles.ticketButton,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleViewTicket}
            >
              <Ionicons name="document-text" size={18} color={colors.primary} />
              <Text
                style={[styles.ticketButtonText, { color: colors.primary }]}
              >
                View Ticket File
              </Text>
              <Ionicons name="open" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        {canPerformActions && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleCompleteTrip}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.text.inverse}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    Complete Trip
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.error,
                  borderWidth: 1.5,
                },
              ]}
              onPress={handleCancelTrip}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, { color: colors.error }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  routeContainer: {
    marginBottom: Spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInfo: {},
  routeLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  routeConnector: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: Spacing.xs,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  scheduleGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  scheduleBlock: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  scheduleDate: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: Typography.sizes.xs,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  slotsInfo: {
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
  slotsCount: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  pnrSection: {
    marginBottom: Spacing.md,
  },
  pnrLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  pnrValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  categoriesSection: {
    marginBottom: Spacing.md,
  },
  categoriesTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  notesSection: {
    marginBottom: Spacing.md,
  },
  notesTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  ticketSection: {},
  ticketTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
