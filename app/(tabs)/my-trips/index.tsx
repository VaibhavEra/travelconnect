import FilterChip from "@/components/shared/FilterChip";
import ModeSwitcher from "@/components/shared/ModeSwitcher";
import TripCard from "@/components/trip/TripCard";
import { isFuture } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type TripFilter = "all" | "upcoming" | "completed" | "cancelled";

const FILTER_CONFIG: Array<{
  key: TripFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "all", label: "All", icon: "apps" },
  { key: "upcoming", label: "Upcoming", icon: "time" },
  { key: "completed", label: "Completed", icon: "checkmark-done" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle" },
];

export default function MyTripsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { trips, loading, getMyTrips } = useTripStore();
  const [filter, setFilter] = useState<TripFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const headerOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(scrollY.value > 50 ? 0 : 1),
  }));

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        getMyTrips(user.id);
      }
    }, [user?.id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    if (user?.id) {
      await getMyTrips(user.id);
    }
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const isTripUpcoming = (trip: any) => {
    return (
      isFuture(trip.departure_date, trip.departure_time) &&
      trip.status === "open"
    );
  };

  const getFilteredTrips = () => {
    switch (filter) {
      case "upcoming":
        return trips.filter(isTripUpcoming);
      case "completed":
        return trips.filter((trip) => trip.status === "completed");
      case "cancelled":
        return trips.filter((trip) => trip.status === "cancelled");
      default:
        return trips;
    }
  };

  const getFilterCount = (filterType: TripFilter) => {
    if (filterType === "all") return trips.length;
    if (filterType === "upcoming") {
      return trips.filter(isTripUpcoming).length;
    }
    if (filterType === "completed") {
      return trips.filter((trip) => trip.status === "completed").length;
    }
    if (filterType === "cancelled") {
      return trips.filter((trip) => trip.status === "cancelled").length;
    }
    return 0;
  };

  const filteredTrips = getFilteredTrips();
  const upcomingCount = getFilterCount("upcoming");
  const completedCount = getFilterCount("completed");

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading your trips...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* FIXED: Added border */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            My Trips
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.text.secondary }]}
          >
            {trips.length} {trips.length === 1 ? "trip" : "trips"}
          </Text>
        </View>
        <ModeSwitcher />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats Cards */}
        {trips.length > 0 && (
          <Animated.View style={[styles.statsContainer, headerOpacity]}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="airplane" size={20} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {trips.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.primary }]}>
                Total Trips
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.warning + "15" },
              ]}
            >
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {upcomingCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.warning }]}>
                Upcoming
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Ionicons
                name="checkmark-done"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {completedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Completed
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Filters */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTER_CONFIG.map((filterConfig) => {
              const count = getFilterCount(filterConfig.key);
              const isActive = filter === filterConfig.key;

              return (
                <FilterChip
                  key={filterConfig.key}
                  label={filterConfig.label}
                  icon={filterConfig.icon}
                  count={count}
                  active={isActive}
                  onPress={() => {
                    haptics.selection();
                    setFilter(filterConfig.key);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Empty State */}
        {filteredTrips.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.background.secondary },
              ]}
            >
              <Ionicons
                name={filter === "all" ? "airplane-outline" : "search-outline"}
                size={64}
                color={colors.text.tertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {filter === "all" ? "No Trips Yet" : `No ${filter} trips`}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {filter === "all"
                ? "Create your first trip to start helping senders"
                : `You don't have any ${filter} trips at the moment`}
            </Text>
          </Animated.View>
        ) : (
          /* Trips List */
          <Animated.View layout={Layout.springify()} style={styles.tripsList}>
            {filteredTrips.map((trip, index) => (
              <Animated.View
                key={trip.id}
                entering={FadeInDown.delay(index * 50)}
                layout={Layout.springify()}
              >
                <TripCard trip={trip} />
              </Animated.View>
            ))}
          </Animated.View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, // FIXED: Added border
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  statNumber: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.medium,
    textAlign: "center",
  },
  filtersWrapper: {
    marginBottom: Spacing.lg,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl * 1.5,
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: "center",
    lineHeight: Typography.sizes.md * 1.5,
    paddingHorizontal: Spacing.xl,
  },
  tripsList: {
    gap: Spacing.md,
  },
});
