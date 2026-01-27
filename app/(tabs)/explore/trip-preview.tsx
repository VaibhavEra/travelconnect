import { haptics } from "@/lib/utils/haptics";
import { Trip, useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
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

export default function TripPreviewScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentTrip, loading, getTripById } = useTripStore();

  useEffect(() => {
    if (id) {
      getTripById(id);
    }
  }, [id]);

  const formatDate = (date: string) => {
    const d = new Date(date);
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

  const handleRequestParcel = () => {
    haptics.selection();
    router.push({
      pathname: "/(tabs)/explore/request-form",
      params: { id: id },
    });
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
        </View>
      </SafeAreaView>
    );
  }

  // Render slot dots
  const renderSlots = () => {
    const slots = [];
    const maxSlots = Math.min(currentTrip.total_slots, 5);

    for (let i = 0; i < maxSlots; i++) {
      const isAvailable = i < currentTrip.available_slots;
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

  const isFull = currentTrip.available_slots === 0;

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
        {/* Main Info Card */}
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

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <Text
              style={[styles.categoriesTitle, { color: colors.text.primary }]}
            >
              Allowed Categories
            </Text>
            <View style={styles.categoriesGrid}>
              {currentTrip.allowed_categories.map((category) => (
                <View
                  key={category}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: colors.primary + "10" },
                  ]}
                >
                  <Text
                    style={[styles.categoryText, { color: colors.primary }]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </View>
              ))}
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
                  Traveller's Notes
                </Text>
                <Text
                  style={[styles.notesText, { color: colors.text.secondary }]}
                >
                  {currentTrip.notes}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background.primary,
            borderTopColor: colors.border.light,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.requestButton,
            { backgroundColor: colors.primary },
            isFull && styles.requestButtonDisabled,
            pressed && !isFull && styles.requestButtonPressed,
          ]}
          onPress={handleRequestParcel}
          disabled={isFull}
        >
          <Ionicons name="add-circle" size={20} color={colors.text.inverse} />
          <Text
            style={[styles.requestButtonText, { color: colors.text.inverse }]}
          >
            {isFull ? "No Slots Available" : "Request Parcel Delivery"}
          </Text>
        </Pressable>
      </View>
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
    flexGrow: 1,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  notesSection: {},
  notesTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  requestButtonDisabled: {
    opacity: 0.5,
  },
  requestButtonPressed: {
    opacity: 0.8,
  },
  requestButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
