// app/(tabs)/my-trips/[id].tsx
import CancellationOtpModal from "@/components/modals/CancellationOtpModal";
import EditTripDatesModal from "@/components/trip/EditTripDatesModal";
import EditTripDetailsModal from "@/components/trip/EditTripDetailsModal";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import {
  getSizeCapacityIcon,
  getSizeCapacityLabel,
} from "@/lib/constants/parcel";
import { TRIP_STATUS_CONFIG, TripStatus } from "@/lib/constants/status";
import { TRANSPORT_CONFIG } from "@/lib/constants/transport";
import {
  showConfirmAlert,
  showErrorAlert,
  showSessionAlert,
} from "@/lib/utils/alerts";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import { useAuthStore } from "@/stores/authStore";
import { useRequestStore } from "@/stores/requestStore";
import { useTripStore } from "@/stores/tripStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MODULE = "TripDetailsScreen";

export default function TripDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const {
    currentTrip,
    loading,
    getTripById,
    deleteTrip,
    canEditTrip,
    canEditTripDates,
  } = useTripStore();
  const {
    acceptedRequests,
    getAcceptedRequests,
    generateCancellationOtp,
    verifyCancellationOtpAndCancel,
  } = useRequestStore();
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showCancellationOtpModal, setShowCancellationOtpModal] =
    useState(false);

  // Store generated cancellation OTP data
  const [cancellationOtpData, setCancellationOtpData] = useState<{
    requestId: string;
    senderName: string;
  } | null>(null);

  // Permission states
  const [canEditDetails, setCanEditDetails] = useState(false);
  const [canEditDates, setCanEditDates] = useState(false);

  useEffect(() => {
    if (id) {
      getTripById(id);
    }
  }, [id]);

  useEffect(() => {
    // Fetch accepted requests to check pickup status
    if (user?.id) {
      getAcceptedRequests(user.id);
    }
  }, [user?.id]);

  // Check edit permissions when trip loads or status changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (id) {
        const detailsPermission = await canEditTrip(id);
        const datesPermission = await canEditTripDates(id);
        setCanEditDetails(detailsPermission);
        setCanEditDates(datesPermission);
      }
    };

    checkPermissions();
  }, [id, currentTrip?.status]);

  // Check if any request for this trip has been picked up
  const checkIfPickedUp = (): {
    hasPickup: boolean;
    pickedUpRequest?: any;
  } => {
    const linkedRequest = acceptedRequests.find(
      (req) => req.trip_id === id && req.status === "picked_up",
    );

    return {
      hasPickup: !!linkedRequest,
      pickedUpRequest: linkedRequest,
    };
  };

  // Handle trip cancellation with OTP check
  const handleCancelTrip = async () => {
    haptics.light();

    // Check if any parcel has been picked up
    const { hasPickup, pickedUpRequest } = checkIfPickedUp();

    if (hasPickup && pickedUpRequest) {
      // CASE 1: After pickup - Need OTP from sender
      showConfirmAlert(
        "Cancellation Requires OTP",
        "A parcel has been picked up for this trip. To cancel, you need a cancellation OTP from the sender.",
        async () => {
          try {
            setActionLoading(true);

            // Generate cancellation OTP
            await generateCancellationOtp(pickedUpRequest.id);

            // Store request info for OTP modal
            setCancellationOtpData({
              requestId: pickedUpRequest.id,
              senderName: pickedUpRequest.sender?.full_name || "the sender",
            });

            haptics.success();
            setShowCancellationOtpModal(true);
          } catch (error) {
            haptics.error();
            logger.error("Failed to generate cancellation OTP", error, {
              module: MODULE,
            });
            showErrorAlert(error);
          } finally {
            setActionLoading(false);
          }
        },
        "Get OTP",
        false,
      );
    } else {
      // CASE 2: Before pickup - Direct cancellation
      showConfirmAlert(
        "Cancel Trip",
        "Are you sure you want to cancel this trip? This action cannot be undone.",
        async () => {
          try {
            setActionLoading(true);
            await deleteTrip(id);
            haptics.success();
            showSuccessToast("Trip cancelled successfully");
            router.back();
          } catch (error) {
            haptics.error();
            logger.error("Failed to cancel trip", error, { module: MODULE });
            showErrorAlert(error);
          } finally {
            setActionLoading(false);
          }
        },
        "Yes, Cancel",
      );
    }
  };

  // Handle cancellation OTP verification
  const handleVerifyCancellationOtp = async (otp: string): Promise<boolean> => {
    if (!cancellationOtpData) return false;

    try {
      // Pass trip ID to match the backend function
      const isValid = await verifyCancellationOtpAndCancel(id, otp);

      if (isValid) {
        haptics.success();
        showSessionAlert(
          "Trip Cancelled",
          "Your trip and the linked request have been cancelled successfully.",
          () => router.back(),
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Cancellation OTP verification failed", error, {
        module: MODULE,
      });
      throw error;
    }
  };

  const handleViewTicket = () => {
    haptics.light();
    if (currentTrip?.ticket_file_url) {
      Linking.openURL(currentTrip.ticket_file_url).catch((error) => {
        logger.error("Failed to open ticket file", error, { module: MODULE });
        showErrorAlert(error);
      });
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  const handleEditDetails = () => {
    haptics.light();
    setShowDetailsModal(true);
  };

  const handleEditDates = () => {
    haptics.light();
    setShowDatesModal(true);
  };

  if (loading || !currentTrip) {
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
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = currentTrip.status as TripStatus;
  const statusConfig = TRIP_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  // FIX (Issue #25): Added in_progress so Cancel Trip button appears
  // when trip has picked_up parcels (departure has passed)
  const canCancel =
    status === "upcoming" || status === "locked" || status === "in_progress";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header - NO GLOBAL EDIT BUTTON */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          style={[
            styles.backButton,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Trip Details
          </Text>
          <View style={styles.statusBadge}>
            <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {/* Route (READ-ONLY - never editable) */}
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View
                style={[styles.routeDot, { backgroundColor: colors.primary }]}
              />
              <View style={styles.routeInfo}>
                <Text
                  style={[styles.routeLabel, { color: colors.text.tertiary }]}
                >
                  From
                </Text>
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {currentTrip.source}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.routeConnector,
                { borderColor: colors.border.default },
              ]}
            />

            <View style={styles.routePoint}>
              <View
                style={[styles.routeDot, { backgroundColor: colors.success }]}
              />
              <View style={styles.routeInfo}>
                <Text
                  style={[styles.routeLabel, { color: colors.text.tertiary }]}
                >
                  To
                </Text>
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {currentTrip.destination}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Schedule Section with CONDITIONAL Edit Button */}
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text
                style={[styles.sectionLabel, { color: colors.text.tertiary }]}
              >
                SCHEDULE
              </Text>
              {canEditDates && (
                <Pressable onPress={handleEditDates} hitSlop={8}>
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              )}
            </View>

            <View style={styles.scheduleGrid}>
              {/* Departure */}
              <View style={styles.scheduleBlock}>
                <View
                  style={[
                    styles.scheduleIconContainer,
                    { backgroundColor: colors.primary + "10" },
                  ]}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.scheduleDetails}>
                  <Text
                    style={[
                      styles.scheduleLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    Departure
                  </Text>
                  <Text
                    style={[
                      styles.scheduleDate,
                      { color: colors.text.primary },
                    ]}
                  >
                    {formatDate(currentTrip.departure_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(currentTrip.departure_time)}
                  </Text>
                </View>
              </View>

              {/* Arrival */}
              <View style={styles.scheduleBlock}>
                <View
                  style={[
                    styles.scheduleIconContainer,
                    { backgroundColor: colors.success + "10" },
                  ]}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={20}
                    color={colors.success}
                  />
                </View>
                <View style={styles.scheduleDetails}>
                  <Text
                    style={[
                      styles.scheduleLabel,
                      { color: colors.text.tertiary },
                    ]}
                  >
                    Arrival
                  </Text>
                  <Text
                    style={[
                      styles.scheduleDate,
                      { color: colors.text.primary },
                    ]}
                  >
                    {formatDate(currentTrip.arrival_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(currentTrip.arrival_time)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Trip Details Section with CONDITIONAL Edit Button */}
          <View style={styles.tripDetailsSection}>
            <View style={styles.tripDetailsSectionHeader}>
              <Text
                style={[styles.sectionLabel, { color: colors.text.tertiary }]}
              >
                TRIP DETAILS
              </Text>
              {canEditDetails && (
                <Pressable onPress={handleEditDetails} hitSlop={8}>
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.primary}
                  />
                </Pressable>
              )}
            </View>

            {/* Transport (READ-ONLY) and Parcel Size (editable) */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.primary + "10" },
                  ]}
                >
                  <Ionicons
                    name={TRANSPORT_CONFIG[currentTrip.transport_mode].icon}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.infoLabel, { color: colors.text.tertiary }]}
                  >
                    Transport
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.text.primary }]}
                  >
                    {currentTrip.transport_mode.charAt(0).toUpperCase() +
                      currentTrip.transport_mode.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.success + "10" },
                  ]}
                >
                  <Ionicons
                    name={getSizeCapacityIcon(currentTrip.parcel_size_capacity)}
                    size={18}
                    color={colors.success}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.infoLabel, { color: colors.text.tertiary }]}
                  >
                    Parcel Size
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.text.primary }]}
                  >
                    {getSizeCapacityLabel(currentTrip.parcel_size_capacity)}
                  </Text>
                </View>
              </View>
            </View>

            {/* PNR Number (editable via modal) */}
            <View style={styles.pnrSection}>
              <Text style={[styles.pnrLabel, { color: colors.text.tertiary }]}>
                PNR Number
              </Text>
              <Text style={[styles.pnrValue, { color: colors.text.primary }]}>
                {currentTrip.pnr_number}
              </Text>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Categories (editable via modal) */}
          <View style={styles.categoriesSection}>
            <Text
              style={[styles.categoriesTitle, { color: colors.text.primary }]}
            >
              Allowed Categories
            </Text>
            <View style={styles.categoriesGrid}>
              {currentTrip.allowed_categories.map((category) => {
                const config =
                  CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <View
                    key={category}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                  >
                    <Ionicons
                      name={config?.icon || "cube"}
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.categoryText, { color: colors.primary }]}
                    >
                      {config?.label || category}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Ticket (editable via modal) */}
          <View style={styles.ticketSection}>
            <Text style={[styles.ticketTitle, { color: colors.text.primary }]}>
              Travel Ticket
            </Text>
            <Pressable
              style={[
                styles.ticketButton,
                {
                  backgroundColor: colors.primary + "10",
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleViewTicket}
            >
              <Ionicons name="document-text" size={18} color={colors.primary} />
              <Text
                style={[styles.ticketButtonText, { color: colors.primary }]}
              >
                View Ticket File
              </Text>
              <Ionicons name="open" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Cancel Button */}
        {canCancel && (
          <Pressable
            style={[
              styles.cancelButton,
              {
                backgroundColor: colors.background.secondary,
                borderColor: colors.error,
              },
            ]}
            onPress={handleCancelTrip}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={colors.error} />
                <Text
                  style={[styles.cancelButtonText, { color: colors.error }]}
                >
                  Cancel Trip
                </Text>
              </>
            )}
          </Pressable>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Modals */}
      {currentTrip && (
        <>
          <EditTripDetailsModal
            visible={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            trip={currentTrip}
          />
          <EditTripDatesModal
            visible={showDatesModal}
            onClose={() => setShowDatesModal(false)}
            trip={currentTrip}
          />
          {/* Cancellation OTP Modal */}
          {cancellationOtpData && (
            <CancellationOtpModal
              visible={showCancellationOtpModal}
              onClose={() => {
                setShowCancellationOtpModal(false);
                setCancellationOtpData(null);
              }}
              onVerify={handleVerifyCancellationOtp}
              senderName={cancellationOtpData.senderName}
              requestId={cancellationOtpData.requestId}
            />
          )}
        </>
      )}
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
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  routeContainer: {
    marginBottom: Spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeInfo: {},
  routeLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  routeConnector: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: Spacing.xs,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  scheduleSection: {
    marginBottom: Spacing.md,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
  },
  scheduleGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  scheduleBlock: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  scheduleDate: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: Typography.sizes.xs,
  },
  tripDetailsSection: {
    marginBottom: Spacing.md,
  },
  tripDetailsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  pnrSection: {
    marginBottom: 0,
  },
  pnrLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  pnrValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  categoriesSection: {
    marginBottom: Spacing.md,
  },
  categoriesTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  ticketSection: {},
  ticketTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
