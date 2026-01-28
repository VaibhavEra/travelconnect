import RequestCard from "@/components/request/RequestCard";
import FilterChip from "@/components/shared/FilterChip";
import ModeSwitcher from "@/components/shared/ModeSwitcher";
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
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

type StatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

const FILTER_CONFIG: Array<{
  key: StatusFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "all", label: "All", icon: "apps" },
  { key: "pending", label: "Pending", icon: "time" },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle" },
  { key: "completed", label: "Completed", icon: "checkmark-done" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle" },
];

export default function MyRequestsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { myRequests, loading, getMyRequests } = useRequestStore();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Animated header for scroll
  const scrollY = useSharedValue(0);
  const headerOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(scrollY.value > 50 ? 0 : 1),
  }));

  useFocusEffect(
    useCallback(() => {
      if (user) {
        getMyRequests(user.id);
      }
    }, [user]),
  );

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    haptics.light();
    await getMyRequests(user.id);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const filteredRequests = myRequests.filter((request) => {
    if (filter === "all") return true;
    if (filter === "completed") {
      return request.status === "delivered";
    }
    if (filter === "cancelled") {
      return request.status === "cancelled" || request.status === "rejected";
    }
    return request.status === filter;
  });

  const getFilterCount = (filterType: StatusFilter) => {
    if (filterType === "all") return myRequests.length;
    if (filterType === "completed") {
      return myRequests.filter((r) => r.status === "delivered").length;
    }
    if (filterType === "cancelled") {
      return myRequests.filter(
        (r) => r.status === "cancelled" || r.status === "rejected",
      ).length;
    }
    return myRequests.filter((r) => r.status === filterType).length;
  };

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
          Loading your requests...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header - Matching Explore Style */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            My Requests
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.text.secondary }]}
          >
            {myRequests.length}{" "}
            {myRequests.length === 1 ? "request" : "requests"}
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
        {/* Stats Cards - Hide on scroll */}
        {myRequests.length > 0 && (
          <Animated.View style={[styles.statsContainer, headerOpacity]}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="cube" size={20} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {myRequests.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.primary }]}>
                Total Requests
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
                {getFilterCount("pending")}
              </Text>
              <Text style={[styles.statLabel, { color: colors.warning }]}>
                Pending
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
                {getFilterCount("completed")}
              </Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Completed
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Filters - Sticky on scroll */}
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
        {filteredRequests.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: colors.background.secondary },
              ]}
            >
              <Ionicons
                name={filter === "all" ? "cube-outline" : "search-outline"}
                size={64}
                color={colors.text.tertiary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {filter === "all" ? "No Requests Yet" : `No ${filter} requests`}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {filter === "all"
                ? "Start exploring trips to send your first parcel"
                : `You don't have any ${filter} requests at the moment`}
            </Text>
          </Animated.View>
        ) : (
          /* Requests List */
          <Animated.View
            layout={Layout.springify()}
            style={styles.requestsList}
          >
            {filteredRequests.map((request, index) => (
              <Animated.View
                key={request.id}
                entering={FadeInDown.delay(index * 50)}
                layout={Layout.springify()}
              >
                <RequestCard request={request} />
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
  requestsList: {
    gap: Spacing.md,
  },
});
