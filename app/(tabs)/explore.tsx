import DateFilter from "@/components/search/DateFilter";
import TransportModeFilter from "@/components/search/TransportModeFilter";
import TripSearchBar from "@/components/search/TripSearchBar";
import AvailableTripCard from "@/components/trip/AvailableTripCard";
import { useSearchStore } from "@/stores/searchStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ExploreScreen() {
  const { filters, results, loading, searchTrips, clearFilters } =
    useSearchStore();

  const handleSearch = () => {
    if (!filters.source || !filters.destination) {
      return;
    }
    searchTrips();
  };

  const canSearch = filters.source && filters.destination;
  const hasSearched = results.length > 0 || loading;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Find Trips</Text>
          <Text style={styles.subtitle}>
            Search for trips matching your delivery needs
          </Text>
        </View>

        <TripSearchBar />

        <View style={styles.filtersSection}>
          <DateFilter />
          <TransportModeFilter />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.searchButton,
              !canSearch && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={!canSearch || loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text.inverse} size="small" />
            ) : (
              <>
                <Ionicons name="search" size={20} color={Colors.text.inverse} />
                <Text style={styles.searchButtonText}>Search Trips</Text>
              </>
            )}
          </Pressable>

          {hasSearched && (
            <Pressable style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={20} color={Colors.primary} />
              <Text style={styles.clearButtonText}>Clear Search</Text>
            </Pressable>
          )}
        </View>

        {hasSearched && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {loading ? "Searching..." : `${results.length} Trip(s) Found`}
              </Text>
            </View>

            {!loading && results.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={64}
                  color={Colors.text.tertiary}
                />
                <Text style={styles.emptyTitle}>No trips found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your filters or search criteria
                </Text>
              </View>
            )}

            {!loading && results.length > 0 && (
              <View style={styles.resultsList}>
                {results.map((trip) => (
                  <AvailableTripCard
                    key={trip.id}
                    trip={trip}
                    onRequestParcel={() => {
                      // Will implement in Phase 7
                      console.log("Request parcel for trip:", trip.id);
                    }}
                  />
                ))}
              </View>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
  },
  filtersSection: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.background.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  resultsSection: {
    marginTop: Spacing.md,
  },
  resultsHeader: {
    marginBottom: Spacing.md,
  },
  resultsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
    textAlign: "center",
  },
  resultsList: {
    gap: Spacing.md,
  },
});
