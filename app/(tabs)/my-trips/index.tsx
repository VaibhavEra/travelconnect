import { ScreenHeader } from "@/components/shared";
import FilterChip from "@/components/shared/FilterChip";
import TripCard from "@/components/trip/TripCard";
import { TRIP_FILTERS, TripFilterKey } from "@/lib/constants/filters";
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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

export default function MyTripsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { trips, loading, getMyTrips } = useTripStore();
  const [filter, setFilter] = useState<TripFilterKey>("all");
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

  const handleCreateTrip = () => {
    haptics.light();
    router.push("/(tabs)/create-trip");
  };

  const getFilteredTrips = () => {
    if (filter === "all") return trips;
    return trips.filter((trip) => trip.status === filter);
  };

  const getFilterCount = (filterType: TripFilterKey) => {
    if (filterType === "all") return trips.length;
    return trips.filter((trip) => trip.status === filterType).length;
  };

  const filteredTrips = getFilteredTrips();
  const upcomingCount = getFilterCount("upcoming");
  const inProgressCount = getFilterCount("in_progress");
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
      <ScreenHeader
        title="My Trips"
        subtitle={`${trips.length} ${trips.length === 1 ? "trip" : "trips"}`}
      />

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
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Ionicons name="time" size={20} color={colors.success} />
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {upcomingCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Upcoming
              </Text>
            </View>

            <View
              style={[styles.statCard, { backgroundColor: colors.info + "15" }]}
            >
              <Ionicons name="bicycle" size={20} color={colors.info} />
              <Text style={[styles.statNumber, { color: colors.info }]}>
                {inProgressCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.info }]}>
                In Progress
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
            {TRIP_FILTERS.map((filterConfig) => {
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
            {filter === "all" && (
              <Pressable
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateTrip}
              >
                <Ionicons name="add" size={20} color={colors.text.inverse} />
                <Text
                  style={[
                    styles.emptyButtonText,
                    { color: colors.text.inverse },
                  ]}
                >
                  Create Trip
                </Text>
              </Pressable>
            )}
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

      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateTrip}
      >
        <Ionicons name="add" size={28} color={colors.text.inverse} />
      </Pressable>
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
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  tripsList: {
    gap: Spacing.md,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
