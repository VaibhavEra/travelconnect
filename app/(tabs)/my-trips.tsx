import TripCard from "@/components/trip/TripCard";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TripFilter = "all" | "upcoming" | "completed" | "cancelled";

export default function MyTripsScreen() {
  const { user } = useAuthStore();
  const { trips, loading, getMyTrips } = useTripStore();
  const [filter, setFilter] = useState<TripFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        getMyTrips(user.id);
      }
    }, [user?.id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await getMyTrips(user.id);
    }
    setRefreshing(false);
  };

  const getFilteredTrips = () => {
    const now = new Date();

    switch (filter) {
      case "upcoming":
        return trips.filter((trip) => {
          const departureDateTime = new Date(
            `${trip.departure_date}T${trip.departure_time}`,
          );
          return departureDateTime > now && trip.status === "open";
        });
      case "completed":
        return trips.filter((trip) => trip.status === "completed");
      case "cancelled":
        return trips.filter((trip) => trip.status === "cancelled");
      default:
        return trips;
    }
  };

  const filteredTrips = getFilteredTrips();

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.subtitle}>
          Manage your trips and parcel requests
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {(["all", "upcoming", "completed", "cancelled"] as TripFilter[]).map(
          (filterOption) => (
            <FilterButton
              key={filterOption}
              label={
                filterOption.charAt(0).toUpperCase() + filterOption.slice(1)
              }
              active={filter === filterOption}
              onPress={() => setFilter(filterOption)}
            />
          ),
        )}
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="airplane-outline"
              size={64}
              color={Colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No trips found</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? "Create your first trip to get started"
                : `No ${filter} trips`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
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
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
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
});
