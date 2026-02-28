import { RequestCard } from "@/components/request";
import {
  FilterChip,
  LoadingScreen,
  ScreenContainer,
  ScreenHeader,
} from "@/components/shared";
import { REQUEST_FILTERS, RequestFilterKey } from "@/lib/constants";
import { haptics } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography, useThemeColors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
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

export default function MyRequestsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { myRequests, loading, getMyRequests } = useRequestStore();
  const [filter, setFilter] = useState<RequestFilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

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

  const getFilteredRequests = () => {
    if (filter === "all") return myRequests;
    return myRequests.filter((request) => request.status === filter);
  };

  const getFilterCount = (filterType: RequestFilterKey) => {
    if (filterType === "all") return myRequests.length;
    return myRequests.filter((r) => r.status === filterType).length;
  };

  const filteredRequests = getFilteredRequests();
  const pendingCount = getFilterCount("pending");
  const deliveredCount = getFilterCount("delivered");

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading your requests..." />;
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title="My Requests"
        subtitle={`${myRequests.length} ${myRequests.length === 1 ? "request" : "requests"}`}
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
                Total
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
                {pendingCount}
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
                {deliveredCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Delivered
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {REQUEST_FILTERS.map((filterConfig) => {
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
