import {
  BackButton,
  LoadingScreen,
  ScreenContainer,
} from "@/components/shared";
import AvailableTripCard from "@/components/trip/AvailableTripCard";
import { haptics } from "@/lib/utils/haptics";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ExploreResultsScreen() {
  const colors = useThemeColors();
  const { filters, results, loading, searchTrips, clearFilters } =
    useSearchStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await searchTrips();
    setRefreshing(false);
  };

  const handleModifySearch = () => {
    haptics.light();
    router.back();
  };

  const handleClearAndNewSearch = () => {
    haptics.light();
    clearFilters();
    router.back();
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Searching for trips..." />;
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <BackButton />
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Available Trips
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.text.secondary }]}
          >
            {filters.source} → {filters.destination}
          </Text>
        </View>
        {/* Modify Search Button */}
        <Pressable
          onPress={handleModifySearch}
          hitSlop={10}
          style={[
            styles.modifyButton,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.text.primary }]}>
            {results.length} {results.length === 1 ? "Trip" : "Trips"}
          </Text>
          <Pressable onPress={handleClearAndNewSearch}>
            <Text style={[styles.newSearchLink, { color: colors.primary }]}>
              New Search
            </Text>
          </Pressable>
        </View>

        {/* Empty State */}
        {results.length === 0 && (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.background.secondary },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={56}
                color={colors.text.tertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Trips Found
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              We couldn't find any trips matching your search
            </Text>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleModifySearch}
            >
              <Text
                style={[styles.emptyButtonText, { color: colors.text.inverse }]}
              >
                Modify Search
              </Text>
            </Pressable>
          </View>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <View style={styles.resultsList}>
            {results.map((trip) => (
              <AvailableTripCard key={trip.id} trip={trip} />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
  },
  modifyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resultsCount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  newSearchLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  resultsList: {
    gap: Spacing.md,
  },
});
