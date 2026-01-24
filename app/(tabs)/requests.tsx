import DeliveryCard from "@/components/delivery/DeliveryCard";
import RequestCard from "@/components/request/RequestCard";
import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
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

type RequestFilter = "all" | "pending" | "accepted" | "rejected";
type DeliveryFilter = "all" | "ready" | "transit" | "completed";
type ViewMode = "incoming" | "accepted";

export default function RequestsScreen() {
  const { user } = useAuthStore();
  const { currentMode } = useModeStore();
  const {
    incomingRequests,
    acceptedRequests,
    loading,
    getIncomingRequests,
    getAcceptedRequests,
  } = useRequestStore();
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("incoming");

  useFocusEffect(
    useCallback(() => {
      if (user && currentMode === "traveller") {
        if (viewMode === "incoming") {
          getIncomingRequests(user.id);
        } else {
          getAcceptedRequests(user.id);
        }
      }
    }, [user, currentMode, viewMode]),
  );

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    if (viewMode === "incoming") {
      await getIncomingRequests(user.id);
    } else {
      await getAcceptedRequests(user.id);
    }
    setRefreshing(false);
  };

  const filteredRequests = incomingRequests.filter((request) => {
    if (requestFilter === "all") return true;
    return request.status === requestFilter;
  });

  const filteredDeliveries = acceptedRequests.filter((request) => {
    if (deliveryFilter === "all") return true;
    if (deliveryFilter === "ready") return request.status === "accepted";
    if (deliveryFilter === "transit") return request.status === "picked_up";
    if (deliveryFilter === "completed") return request.status === "delivered";
    return true;
  });

  const getRequestFilterCount = (filterType: RequestFilter) => {
    if (filterType === "all") return incomingRequests.length;
    return incomingRequests.filter((r) => r.status === filterType).length;
  };

  const getDeliveryFilterCount = (filterType: DeliveryFilter) => {
    if (filterType === "all") return acceptedRequests.length;
    if (filterType === "ready") {
      return acceptedRequests.filter((r) => r.status === "accepted").length;
    }
    if (filterType === "transit") {
      return acceptedRequests.filter((r) => r.status === "picked_up").length;
    }
    if (filterType === "completed") {
      return acceptedRequests.filter((r) => r.status === "delivered").length;
    }
    return 0;
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
          <Text style={styles.title}>
            {viewMode === "incoming" ? "Parcel Requests" : "Active Deliveries"}
          </Text>
          <Text style={styles.subtitle}>
            {viewMode === "incoming"
              ? "Review and manage incoming requests"
              : "Manage parcels you're delivering"}
          </Text>
        </View>

        <View style={styles.viewSwitcher}>
          <View
            style={[
              styles.viewTab,
              viewMode === "incoming" && styles.viewTabActive,
            ]}
            onTouchEnd={() => setViewMode("incoming")}
          >
            <Text
              style={[
                styles.viewTabText,
                viewMode === "incoming" && styles.viewTabTextActive,
              ]}
            >
              Incoming
            </Text>
            {incomingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{incomingRequests.length}</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.viewTab,
              viewMode === "accepted" && styles.viewTabActive,
            ]}
            onTouchEnd={() => setViewMode("accepted")}
          >
            <Text
              style={[
                styles.viewTabText,
                viewMode === "accepted" && styles.viewTabTextActive,
              ]}
            >
              Active
            </Text>
            {acceptedRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{acceptedRequests.length}</Text>
              </View>
            )}
          </View>
        </View>

        {viewMode === "incoming" ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              <FilterChip
                label="All"
                count={getRequestFilterCount("all")}
                active={requestFilter === "all"}
                onPress={() => setRequestFilter("all")}
              />
              <FilterChip
                label="Pending"
                count={getRequestFilterCount("pending")}
                active={requestFilter === "pending"}
                onPress={() => setRequestFilter("pending")}
              />
              <FilterChip
                label="Accepted"
                count={getRequestFilterCount("accepted")}
                active={requestFilter === "accepted"}
                onPress={() => setRequestFilter("accepted")}
              />
              <FilterChip
                label="Rejected"
                count={getRequestFilterCount("rejected")}
                active={requestFilter === "rejected"}
                onPress={() => setRequestFilter("rejected")}
              />
            </ScrollView>

            {filteredRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="mail-outline"
                  size={64}
                  color={Colors.text.tertiary}
                />
                <Text style={styles.emptyTitle}>No requests found</Text>
                <Text style={styles.emptyText}>
                  {requestFilter === "all"
                    ? "You don't have any parcel requests yet"
                    : `No ${requestFilter} requests`}
                </Text>
              </View>
            ) : (
              <View style={styles.requestsList}>
                {filteredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    variant="traveller"
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            >
              <FilterChip
                label="All"
                count={getDeliveryFilterCount("all")}
                active={deliveryFilter === "all"}
                onPress={() => setDeliveryFilter("all")}
              />
              <FilterChip
                label="Ready"
                count={getDeliveryFilterCount("ready")}
                active={deliveryFilter === "ready"}
                onPress={() => setDeliveryFilter("ready")}
              />
              <FilterChip
                label="In Transit"
                count={getDeliveryFilterCount("transit")}
                active={deliveryFilter === "transit"}
                onPress={() => setDeliveryFilter("transit")}
              />
              <FilterChip
                label="Completed"
                count={getDeliveryFilterCount("completed")}
                active={deliveryFilter === "completed"}
                onPress={() => setDeliveryFilter("completed")}
              />
            </ScrollView>

            {filteredDeliveries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="cube-outline"
                  size={64}
                  color={Colors.text.tertiary}
                />
                <Text style={styles.emptyTitle}>No deliveries found</Text>
                <Text style={styles.emptyText}>
                  {deliveryFilter === "all"
                    ? "You haven't accepted any delivery requests yet"
                    : `No ${deliveryFilter} deliveries`}
                </Text>
              </View>
            ) : (
              <View style={styles.deliveriesList}>
                {filteredDeliveries.map((request) => (
                  <DeliveryCard key={request.id} request={request} />
                ))}
              </View>
            )}
          </>
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
  viewSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  viewTabActive: {
    backgroundColor: Colors.background.primary,
  },
  viewTabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.tertiary,
  },
  viewTabTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.weights.semibold,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
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
  deliveriesList: {
    gap: Spacing.md,
  },
});
