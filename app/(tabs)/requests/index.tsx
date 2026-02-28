import { VerifyOtpModal } from "@/components/modals";
import { DeliveryCard, IncomingRequestCard } from "@/components/request";
import {
  FilterChip,
  LoadingScreen,
  ScreenContainer,
  ScreenHeader,
} from "@/components/shared";
import {
  ACTIVE_REQUEST_FILTERS,
  ActiveRequestFilterKey,
  COMPLETED_REQUEST_FILTERS,
  CompletedRequestFilterKey,
  INCOMING_REQUEST_FILTERS,
  IncomingRequestFilterKey,
} from "@/lib/constants";
import { haptics, showSuccessToast } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography, useThemeColors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
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

type ViewMode = "incoming" | "active" | "completed";
type OtpType = "pickup" | "delivery";

export default function RequestsScreen() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const currentMode = useModeStore((state) => state.currentMode);
  const {
    incomingRequests,
    acceptedRequests,
    completedRequests,
    loading,
    getIncomingRequests,
    getAcceptedRequests,
    getCompletedRequests,
    verifyPickupOtp,
    verifyDeliveryOtp,
  } = useRequestStore();

  const [incomingFilter, setIncomingFilter] =
    useState<IncomingRequestFilterKey>("all");
  const [activeFilter, setActiveFilter] =
    useState<ActiveRequestFilterKey>("all");
  const [completedFilter, setCompletedFilter] =
    useState<CompletedRequestFilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("incoming");

  // OTP Modal states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState<OtpType>("pickup");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [otpExpiry, setOtpExpiry] = useState<string>("");
  const [selectedFailedAttempts, setSelectedFailedAttempts] = useState<
    number | null
  >(null);
  const [selectedBlockedUntil, setSelectedBlockedUntil] = useState<
    string | null
  >(null);

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
        } else if (viewMode === "active") {
          getAcceptedRequests(user.id);
        } else {
          getCompletedRequests(user.id);
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
    } else if (viewMode === "active") {
      await getAcceptedRequests(user.id);
    } else {
      await getCompletedRequests(user.id);
    }
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  // ── Filtered lists (direct 1:1 status matching, no aliases) ──────────────

  const filteredIncoming = incomingRequests.filter((r) => {
    if (incomingFilter === "all") return true;
    return r.status === incomingFilter;
  });

  const filteredActive = acceptedRequests.filter((r) => {
    if (activeFilter === "all") return true;
    return r.status === activeFilter;
  });

  const filteredCompleted = completedRequests.filter((r) => {
    if (completedFilter === "all") return true;
    return r.status === completedFilter;
  });

  // ── Filter counts ─────────────────────────────────────────────────────────

  const getIncomingFilterCount = (key: IncomingRequestFilterKey) => {
    if (key === "all") return incomingRequests.length;
    return incomingRequests.filter((r) => r.status === key).length;
  };

  const getActiveFilterCount = (key: ActiveRequestFilterKey) => {
    if (key === "all") return acceptedRequests.length;
    return acceptedRequests.filter((r) => r.status === key).length;
  };

  const getCompletedFilterCount = (key: CompletedRequestFilterKey) => {
    if (key === "all") return completedRequests.length;
    return completedRequests.filter((r) => r.status === key).length;
  };

  // ── Stats cards ───────────────────────────────────────────────────────────

  const pendingCount = incomingRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const acceptedCount = acceptedRequests.filter(
    (r) => r.status === "accepted",
  ).length;
  const inTransitCount = acceptedRequests.filter(
    (r) => r.status === "picked_up",
  ).length;

  // ── OTP handlers ──────────────────────────────────────────────────────────

  const handleMarkPickup = (requestId: string) => {
    const request = acceptedRequests.find((r) => r.id === requestId);
    if (request) {
      setSelectedRequestId(requestId);
      setSelectedUserName(request.sender?.full_name || "Sender");
      setOtpExpiry(request.pickup_otp_expiry || "");
      setSelectedFailedAttempts(request.failed_pickup_attempts ?? null);
      setSelectedBlockedUntil(request.pickup_blocked_until ?? null);
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
      setSelectedFailedAttempts(request.failed_delivery_attempts ?? null);
      setSelectedBlockedUntil(request.delivery_blocked_until ?? null);
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
        showSuccessToast(
          otpType === "pickup"
            ? "Parcel marked as picked up!"
            : "Parcel marked as delivered!",
        );
        await getAcceptedRequests(user.id);
      }
      return isValid;
    } catch (error) {
      throw error;
    }
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading requests..." />;
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={
          viewMode === "incoming"
            ? "Requests"
            : viewMode === "active"
              ? "Deliveries"
              : "Completed"
        }
        subtitle={
          viewMode === "incoming"
            ? `${incomingRequests.length} ${incomingRequests.length === 1 ? "request" : "requests"}`
            : viewMode === "active"
              ? `${acceptedRequests.length} active`
              : `${completedRequests.length} completed`
        }
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

        {/* 3-tab View Switcher */}
        <View style={styles.viewSwitcherWrapper}>
          <View
            style={[
              styles.viewSwitcher,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            {(
              [
                {
                  mode: "incoming" as ViewMode,
                  icon: "mail" as const,
                  label: "Incoming",
                  badge: incomingRequests.length,
                },
                {
                  mode: "active" as ViewMode,
                  icon: "cube" as const,
                  label: "Active",
                  badge: acceptedRequests.length,
                },
                {
                  mode: "completed" as ViewMode,
                  icon: "checkmark-done" as const,
                  label: "Completed",
                  badge: completedRequests.length,
                },
              ] as const
            ).map(({ mode, icon, label, badge }) => (
              <Pressable
                key={mode}
                style={[
                  styles.viewTab,
                  viewMode === mode && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  haptics.selection();
                  setViewMode(mode);
                }}
              >
                <Ionicons
                  name={icon}
                  size={16}
                  color={
                    viewMode === mode
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.viewTabText,
                    {
                      color:
                        viewMode === mode
                          ? colors.text.inverse
                          : colors.text.secondary,
                      fontWeight:
                        viewMode === mode
                          ? Typography.weights.bold
                          : Typography.weights.medium,
                    },
                  ]}
                >
                  {label}
                </Text>
                {badge > 0 && (
                  <View
                    style={[
                      styles.viewBadge,
                      {
                        backgroundColor:
                          viewMode === mode
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
                            viewMode === mode
                              ? colors.text.inverse
                              : colors.primary,
                        },
                      ]}
                    >
                      {badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── INCOMING TAB ─────────────────────────────────────────────────── */}
        {viewMode === "incoming" && (
          <>
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                {INCOMING_REQUEST_FILTERS.map((f) => (
                  <FilterChip
                    key={f.key}
                    label={f.label}
                    icon={f.icon}
                    count={getIncomingFilterCount(
                      f.key as IncomingRequestFilterKey,
                    )}
                    active={incomingFilter === f.key}
                    onPress={() => {
                      haptics.selection();
                      setIncomingFilter(f.key as IncomingRequestFilterKey);
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {filteredIncoming.length === 0 ? (
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
                      incomingFilter === "all"
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
                  {incomingFilter === "all"
                    ? "No Requests Yet"
                    : `No ${incomingFilter} requests`}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  {incomingFilter === "all"
                    ? "New parcel requests will appear here"
                    : `You don't have any ${incomingFilter} requests`}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.requestsList}
              >
                {filteredIncoming.map((request, index) => (
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
        )}

        {/* ── ACTIVE TAB ───────────────────────────────────────────────────── */}
        {viewMode === "active" && (
          <>
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                {ACTIVE_REQUEST_FILTERS.map((f) => (
                  <FilterChip
                    key={f.key}
                    label={f.label}
                    icon={f.icon}
                    count={getActiveFilterCount(
                      f.key as ActiveRequestFilterKey,
                    )}
                    active={activeFilter === f.key}
                    onPress={() => {
                      haptics.selection();
                      setActiveFilter(f.key as ActiveRequestFilterKey);
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {filteredActive.length === 0 ? (
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
                      activeFilter === "all" ? "cube-outline" : "search-outline"
                    }
                    size={64}
                    color={colors.text.tertiary}
                  />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.text.primary }]}
                >
                  {activeFilter === "all"
                    ? "No Active Deliveries"
                    : `No ${activeFilter === "picked_up" ? "in transit" : activeFilter} deliveries`}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  {activeFilter === "all"
                    ? "Accepted requests will appear here"
                    : `No ${activeFilter === "picked_up" ? "in transit" : activeFilter} deliveries at the moment`}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.deliveriesList}
              >
                {filteredActive.map((request, index) => (
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

        {/* ── COMPLETED TAB ────────────────────────────────────────────────── */}
        {viewMode === "completed" && (
          <>
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                {COMPLETED_REQUEST_FILTERS.map((f) => (
                  <FilterChip
                    key={f.key}
                    label={f.label}
                    icon={f.icon}
                    count={getCompletedFilterCount(
                      f.key as CompletedRequestFilterKey,
                    )}
                    active={completedFilter === f.key}
                    onPress={() => {
                      haptics.selection();
                      setCompletedFilter(f.key as CompletedRequestFilterKey);
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            {filteredCompleted.length === 0 ? (
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
                      completedFilter === "all"
                        ? "checkmark-done-circle-outline"
                        : "search-outline"
                    }
                    size={64}
                    color={colors.text.tertiary}
                  />
                </View>
                <Text
                  style={[styles.emptyTitle, { color: colors.text.primary }]}
                >
                  {completedFilter === "all"
                    ? "No Completed Deliveries"
                    : `No ${completedFilter} deliveries`}
                </Text>
                <Text
                  style={[styles.emptyText, { color: colors.text.secondary }]}
                >
                  {completedFilter === "all"
                    ? "Delivered and cancelled requests will appear here"
                    : `You don't have any ${completedFilter} deliveries`}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn}
                layout={Layout.springify()}
                style={styles.deliveriesList}
              >
                {filteredCompleted.map((request, index) => (
                  <Animated.View
                    key={request.id}
                    entering={FadeInDown.delay(index * 50)}
                    layout={Layout.springify()}
                  >
                    <DeliveryCard request={request} />
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* OTP Verification Modal */}
      <VerifyOtpModal
        visible={otpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        onVerify={handleVerifyOtp}
        type={otpType}
        userName={selectedUserName}
        otpExpiry={otpExpiry}
        failedAttempts={selectedFailedAttempts}
        blockedUntil={selectedBlockedUntil}
      />
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
