import RequestCard from "@/components/request/RequestCard";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
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

type StatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export default function MyRequestsScreen() {
  const { user } = useAuthStore();
  const { myRequests, loading, getMyRequests } = useRequestStore();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

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
    await getMyRequests(user.id);
    setRefreshing(false);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Requests</Text>
          <Text style={styles.subtitle}>
            Track your parcel delivery requests
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          <FilterChip
            label="All"
            count={getFilterCount("all")}
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterChip
            label="Pending"
            count={getFilterCount("pending")}
            active={filter === "pending"}
            onPress={() => setFilter("pending")}
          />
          <FilterChip
            label="Accepted"
            count={getFilterCount("accepted")}
            active={filter === "accepted"}
            onPress={() => setFilter("accepted")}
          />
          <FilterChip
            label="Completed"
            count={getFilterCount("completed")}
            active={filter === "completed"}
            onPress={() => setFilter("completed")}
          />
          <FilterChip
            label="Cancelled"
            count={getFilterCount("cancelled")}
            active={filter === "cancelled"}
            onPress={() => setFilter("cancelled")}
          />
        </ScrollView>

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="cube-outline"
              size={64}
              color={Colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? "You haven't made any parcel requests yet"
                : `No ${filter} requests`}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.filterChip, active && styles.filterChipActive]}
      onTouchEnd={onPress}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.filterCount, active && styles.filterCountActive]}>
          <Text
            style={[
              styles.filterCountText,
              active && styles.filterCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  filtersContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  filterCount: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountActive: {
    backgroundColor: Colors.primary,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.text.secondary,
  },
  filterCountTextActive: {
    color: Colors.text.inverse,
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
  requestsList: {
    gap: Spacing.md,
  },
});
