import DateFilter from "@/components/search/DateFilter";
import TransportModeFilter from "@/components/search/TransportModeFilter";
import TripSearchBar from "@/components/search/TripSearchBar";
import { ScreenContainer, ScreenHeader } from "@/components/shared";
import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ExploreSearchScreen() {
  const colors = useThemeColors();
  const { filters, searchTrips } = useSearchStore();

  const canSearch = filters.source && filters.destination;

  const handleSearch = async () => {
    if (!canSearch) return;
    haptics.selection();
    await searchTrips();
    router.push("/(tabs)/explore/results");
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="Find Trips" subtitle="Search for available trips" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cities */}
          <TripSearchBar />

          {/* Date */}
          <View style={styles.filterSection}>
            <DateFilter />
          </View>

          {/* Transport Mode */}
          <View style={styles.filterSection}>
            <TransportModeFilter />
          </View>

          {/* Search Button */}
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: colors.primary },
              !canSearch && styles.searchButtonDisabled,
              pressed && styles.searchButtonPressed,
            ]}
            onPress={handleSearch}
            disabled={!canSearch}
          >
            <Ionicons name="search" size={20} color={colors.text.inverse} />
            <Text
              style={[styles.searchButtonText, { color: colors.text.inverse }]}
            >
              Search Trips
            </Text>
          </Pressable>

          {!canSearch && (
            <View
              style={[
                styles.infoBox,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Select origin and destination to search
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  filterSection: {
    // Just spacing container
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonPressed: {
    opacity: 0.8,
  },
  searchButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
  },
});
