import {
  DetailScreenHeader,
  LoadingScreen,
  ScreenContainer,
} from "@/components/shared";
import {
  TripInfoRow,
  TripRouteCard,
  TripScheduleGrid,
} from "@/components/trip";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { haptics } from "@/lib/utils";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography, useThemeColors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function TripPreviewScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentTrip, loading, getTripById } = useTripStore();

  useEffect(() => {
    if (id) {
      getTripById(id);
    }
  }, [id]);

  const handleRequestParcel = () => {
    haptics.selection();
    router.push({
      pathname: "/(tabs)/explore/request-form",
      params: { id: id },
    });
  };

  if (loading || !currentTrip) {
    return <LoadingScreen />;
  }

  const isNotAvailable = currentTrip.status !== "upcoming";

  return (
    <ScreenContainer>
      {/* Header */}
      <DetailScreenHeader title="Trip Details" />

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
          <TripRouteCard
            source={currentTrip.source}
            destination={currentTrip.destination}
          />

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          <TripScheduleGrid
            departureDate={currentTrip.departure_date}
            departureTime={currentTrip.departure_time}
            arrivalDate={currentTrip.arrival_date}
            arrivalTime={currentTrip.arrival_time}
          />

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          <TripInfoRow
            transportMode={currentTrip.transport_mode}
            parcelSizeCapacity={currentTrip.parcel_size_capacity}
          />

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
                const categoryConfig =
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
                      name={categoryConfig?.icon || "cube-outline"}
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.categoryText, { color: colors.primary }]}
                    >
                      {categoryConfig?.label || category}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
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
            isNotAvailable && styles.requestButtonDisabled,
            pressed && !isNotAvailable && styles.requestButtonPressed,
          ]}
          onPress={handleRequestParcel}
          disabled={isNotAvailable}
        >
          <Ionicons name="add-circle" size={20} color={colors.text.inverse} />
          <Text
            style={[styles.requestButtonText, { color: colors.text.inverse }]}
          >
            {isNotAvailable ? "Trip Not Available" : "Request Parcel Delivery"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  divider: {
    height: 1,
    marginVertical: Spacing.md,
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
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
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
