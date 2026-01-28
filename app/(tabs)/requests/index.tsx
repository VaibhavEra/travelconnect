import DeliveryCard from "@/components/delivery/DeliveryCard";
import VerifyOtpModal from "@/components/modals/VerifyOtpModal";
import IncomingRequestCard from "@/components/request/IncomingRequestCard";
import FilterChip from "@/components/shared/FilterChip";
import ModeSwitcher from "@/components/shared/ModeSwitcher";
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type RequestFilter = "all" | "pending" | "accepted" | "rejected";
type DeliveryFilter = "all" | "ready" | "transit" | "completed";
type ViewMode = "incoming" | "accepted";
type OtpType = "pickup" | "delivery";

export default function RequestsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { currentMode } = useModeStore();
  const {
    incomingRequests,
    acceptedRequests,
    loading,
    getIncomingRequests,
    getAcceptedRequests,
    verifyPickupOtp,
    verifyDeliveryOtp,
  } = useRequestStore();
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("incoming");

  // Unified OTP Modal states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState<OtpType>("pickup");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [otpExpiry, setOtpExpiry] = useState<string>("");

  // Animated header for scroll
  const scrollY = useSharedValue(0);
  const headerOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(scrollY.value > 50 ? 0 : 1),
  }));

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
    haptics.light();
    if (viewMode === "incoming") {
      await getIncomingRequests(user.id);
    } else {
      await getAcceptedRequests(user.id);
    }
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
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

  const handleMarkPickup = (requestId: string) => {
    const request = acceptedRequests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequestId(requestId);
      setSelectedUserName(request.sender?.full_name || "Sender");
      setOtpExpiry(request.pickup_otp_expiry || "");
      setOtpType("pickup");
      setOtpModalVisible(true);
    }
  };

  const handleMarkDelivery = (requestId: string) => {
    const request = acceptedRequests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequestId(requestId);
      setSelectedUserName(request.delivery_contact_name);
      setOtpExpiry(request.delivery_otp_expiry || "");
      setOtpType("delivery");
      setOtpModalVisible(true);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    try {
      const isValid =
        otpType === "pickup"
          ? await verifyPickupOtp(selectedRequestId, otp)
          : await verifyDeliveryOtp(selectedRequestId, otp);

      if (isValid && user) {
        setOtpModalVisible(false);
        Alert.alert(
          "Success",
          otpType === "pickup"
            ? "Parcel marked as picked up!"
            : "Parcel marked as delivered!",
        );
        await getAcceptedRequests(user.id);
      }
      return isValid;
    } catch (error) {
      console.error(`Verify ${otpType} failed:`, error);
      throw error;
    }
  };

  const pendingCount = incomingRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const acceptedCount = acceptedRequests.filter(
    (r) => r.status === "accepted",
  ).length;
  const inTransitCount = acceptedRequests.filter(
    (r) => r.status === "picked_up",
  ).length;

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading requests...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Simplified Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {viewMode === "incoming" ? "Requests" : "Deliveries"}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.text.secondary }]}
          >
            {viewMode === "incoming"
              ? `${incomingRequests.length} ${incomingRequests.length === 1 ? "request" : "requests"}`
              : `${acceptedRequests.length} active`}
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
        {(incomingRequests.length > 0 || acceptedRequests.length > 0) && (
          <Animated.View style={[styles.statsContainer, headerOpacity]}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {incomingRequests.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.primary }]}>
                Incoming
              </Text>
            </View>

            {pendingCount > 0 && (
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
            )}

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.success + "15" },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {acceptedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.success }]}>
                Accepted
              </Text>
            </View>

            {inTransitCount > 0 && (
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="cube" size={20} color={colors.primary} />
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {inTransitCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.primary }]}>
                  In Transit
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* View Switcher - Sticky on scroll */}
        <View style={styles.viewSwitcherWrapper}>
          <View
            style={[
              styles.viewSwitcher,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <Pressable
              style={[
                styles.viewTab,
                viewMode === "incoming" && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => {
                haptics.selection();
                setViewMode("incoming");
              }}
            >
              <Ionicons
                name="mail"
                size={16}
                color={
                  viewMode === "incoming"
                    ? colors.text.inverse
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.viewTabText,
                  {
                    color:
                      viewMode === "incoming"
                        ? colors.text.inverse
                        : colors.text.secondary,
                    fontWeight:
                      viewMode === "incoming"
                        ? Typography.weights.bold
                        : Typography.weights.medium,
                  },
                ]}
              >
                Incoming
              </Text>
              {incomingRequests.length > 0 && (
                <View
                  style={[
                    styles.viewBadge,
                    {
                      backgroundColor:
                        viewMode === "incoming"
                          ? colors.text.inverse + "20"
                          : colors.primary + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewBadgeText,
                      {
                        color:
                          viewMode === "incoming"
                            ? colors.text.inverse
                            : colors.primary,
                      },
                    ]}
                  >
                    {incomingRequests.length}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.viewTab,
                viewMode === "accepted" && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => {
                haptics.selection();
                setViewMode("accepted");
              }}
            >
              <Ionicons
                name="cube"
                size={16}
                color={
                  viewMode === "accepted"
                    ? colors.text.inverse
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.viewTabText,
                  {
                    color:
                      viewMode === "accepted"
                        ? colors.text.inverse
                        : colors.text.secondary,
                    fontWeight:
                      viewMode === "accepted"
                        ? Typography.weights.bold
                        : Typography.weights.medium,
                  },
                ]}
              >
                Active
              </Text>
              {acceptedRequests.length > 0 && (
                <View
                  style={[
                    styles.viewBadge,
                    {
                      backgroundColor:
                        viewMode === "accepted"
                          ? colors.text.inverse + "20"
                          : colors.primary + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewBadgeText,
                      {
                        color:
                          viewMode === "accepted"
                            ? colors.text.inverse
                            : colors.primary,
                      },
                    ]}
                  >
                    {acceptedRequests.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {viewMode === "incoming" ? (
          <>
            {/* Filters */}
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                <FilterChip
                  label="All"
                  icon="apps"
                  count={getRequestFilterCount("all")}
                  active={requestFilter === "all"}
                  onPress={() => {
                    haptics.selection();
                    setRequestFilter("all");
                  }}
                />
                <FilterChip
                  label="Pending"
                  icon="time"
                  count={getRequestFilterCount("pending")}
                  active={requestFilter === "pending"}
                  onPress={() => {
                    haptics.selection();
                    setRequestFilter("pending");
                  }}
                />
                <FilterChip
                  label="Accepted"
                  icon="checkmark-circle"
                  count={getRequestFilterCount("accepted")}
                  active={requestFilter === "accepted"}
                  onPress={() => {
                    haptics.selection();
                    setRequestFilter("accepted");
                  }}
                />
                <FilterChip
                  label="Rejected"
                  icon="close-circle"
                  count={getRequestFilterCount("rejected")}
                  active={requestFilter === "rejected"}
                  onPress={() => {
                    haptics.selection();
                    setRequestFilter("rejected");
                  }}
                />
              </ScrollView>
            </View>

            {/* Empty State or List */}
            {filteredRequests.length === 0 ? (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.emptyState}
              >
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: colors.background.secondary },
                  ]}
                >
                  <Ionicons
                    name={
                      requestFilter === "all"
                        ? "mail-outline"
                        : "search-outline"
                    }
                    size={64}
                    color={colors.text.tertiary}
                  />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.text.primary }]}
                >
                  {requestFilter === "all"
                    ? "No Requests Yet"
                    : `No ${requestFilter} requests`}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  {requestFilter === "all"
                    ? "New parcel requests will appear here"
                    : `You don't have any ${requestFilter} requests`}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.requestsList}
              >
                {filteredRequests.map((request, index) => (
                  <Animated.View
                    key={request.id}
                    entering={FadeInDown.delay(index * 50)}
                    layout={Layout.springify()}
                  >
                    <IncomingRequestCard request={request} />
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </>
        ) : (
          <>
            {/* Delivery Filters */}
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                <FilterChip
                  label="All"
                  icon="apps"
                  count={getDeliveryFilterCount("all")}
                  active={deliveryFilter === "all"}
                  onPress={() => {
                    haptics.selection();
                    setDeliveryFilter("all");
                  }}
                />
                <FilterChip
                  label="Ready"
                  icon="checkmark-circle"
                  count={getDeliveryFilterCount("ready")}
                  active={deliveryFilter === "ready"}
                  onPress={() => {
                    haptics.selection();
                    setDeliveryFilter("ready");
                  }}
                />
                <FilterChip
                  label="In Transit"
                  icon="cube"
                  count={getDeliveryFilterCount("transit")}
                  active={deliveryFilter === "transit"}
                  onPress={() => {
                    haptics.selection();
                    setDeliveryFilter("transit");
                  }}
                />
                <FilterChip
                  label="Completed"
                  icon="checkmark-done"
                  count={getDeliveryFilterCount("completed")}
                  active={deliveryFilter === "completed"}
                  onPress={() => {
                    haptics.selection();
                    setDeliveryFilter("completed");
                  }}
                />
              </ScrollView>
            </View>

            {/* Empty State or List */}
            {filteredDeliveries.length === 0 ? (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.emptyState}
              >
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: colors.background.secondary },
                  ]}
                >
                  <Ionicons
                    name={
                      deliveryFilter === "all"
                        ? "cube-outline"
                        : "search-outline"
                    }
                    size={64}
                    color={colors.text.tertiary}
                  />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.text.primary }]}
                >
                  {deliveryFilter === "all"
                    ? "No Active Deliveries"
                    : `No ${deliveryFilter} deliveries`}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  {deliveryFilter === "all"
                    ? "Accepted requests will appear here"
                    : `No ${deliveryFilter} deliveries at the moment`}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.deliveriesList}
              >
                {filteredDeliveries.map((request, index) => (
                  <Animated.View
                    key={request.id}
                    entering={FadeInDown.delay(index * 50)}
                    layout={Layout.springify()}
                  >
                    <DeliveryCard
                      request={request}
                      onMarkPickup={handleMarkPickup}
                      onMarkDelivery={handleMarkDelivery}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Unified OTP Verification Modal */}
      <VerifyOtpModal
        visible={otpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleVerifyOtp}
        type={otpType}
        userName={selectedUserName}
        otpExpiry={otpExpiry}
      />
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
  viewSwitcherWrapper: {
    marginBottom: Spacing.lg,
  },
  viewSwitcher: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  viewTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  viewTabText: {
    fontSize: Typography.sizes.sm,
  },
  viewBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 22,
    alignItems: "center",
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
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
  deliveriesList: {
    gap: Spacing.md,
  },
});
