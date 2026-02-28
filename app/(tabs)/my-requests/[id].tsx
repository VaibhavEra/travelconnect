// app/(tabs)/my-requests/[id].tsx
import {
  CancelRequestModal,
  EditReceiverDetailsModal,
  EditRequestDetailsModal,
} from "@/components/modals";
import { ContactCard, OtpCard, PhotoGallery } from "@/components/request";
import {
  AlertCard,
  DetailScreenHeader,
  LoadingScreen,
  ScreenContainer,
  StatusBadge,
} from "@/components/shared";
import {
  TripInfoRow,
  TripRouteCard,
  TripScheduleGrid,
} from "@/components/trip";
import {
  CATEGORY_CONFIG,
  REQUEST_STATUS_CONFIG,
  RequestStatus,
} from "@/lib/constants";
import {
  formatCountdown,
  haptics,
  logger,
  showErrorAlert,
  showSuccessToast,
} from "@/lib/utils";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography, useThemeColors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MODULE = "RequestDetailsScreen";

export default function RequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentRequest,
    loading,
    getRequestById,
    cancelRequest,
    canEditRequestDetails,
    canEditReceiverDetails,
    regeneratePickupOtp,
    regenerateDeliveryOtp,
  } = useRequestStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showEditReceiverModal, setShowEditReceiverModal] = useState(false);
  const [regeneratingPickup, setRegeneratingPickup] = useState(false);
  const [regeneratingDelivery, setRegeneratingDelivery] = useState(false);

  // Permission states
  const [canEditDetails, setCanEditDetails] = useState(false);
  const [canEditReceiver, setCanEditReceiver] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

  // Check edit permissions when request loads or status changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (id) {
        const detailsPermission = await canEditRequestDetails(id);
        const receiverPermission = await canEditReceiverDetails(id);
        setCanEditDetails(detailsPermission);
        setCanEditReceiver(receiverPermission);
      }
    };

    checkPermissions();
  }, [id, currentRequest?.status]);

  const handleCancel = async (reason?: string) => {
    try {
      await cancelRequest(id, reason);
      haptics.success();
      showSuccessToast("Your parcel request has been cancelled.");
      router.back();
    } catch (error: unknown) {
      logger.error("Cancel request failed", error, { module: MODULE });
      haptics.error();
      showErrorAlert(error);
    }
  };

  const handleOpenTicket = (url: string) => {
    haptics.light();
    Linking.openURL(url).catch((error: unknown) => {
      logger.error("Failed to open ticket URL", error, { module: MODULE });
      showErrorAlert(error);
    });
  };

  const handleRegeneratePickupOtp = async () => {
    try {
      setRegeneratingPickup(true);
      haptics.light();
      await regeneratePickupOtp(id);
      haptics.success();
      showSuccessToast("Pickup OTP regenerated successfully.");
    } catch (error: unknown) {
      logger.error("Regenerate pickup OTP failed", error, { module: MODULE });
      haptics.error();
      showErrorAlert(error);
    } finally {
      setRegeneratingPickup(false);
    }
  };

  const handleRegenerateDeliveryOtp = async () => {
    try {
      setRegeneratingDelivery(true);
      haptics.light();
      await regenerateDeliveryOtp(id);
      haptics.success();
      showSuccessToast("Delivery OTP regenerated successfully.");
    } catch (error: unknown) {
      logger.error("Regenerate delivery OTP failed", error, { module: MODULE });
      haptics.error();
      showErrorAlert(error);
    } finally {
      setRegeneratingDelivery(false);
    }
  };

  const handleEditDetailsSuccess = async () => {
    await getRequestById(id);
    setShowEditDetailsModal(false);
  };

  const handleEditReceiverSuccess = async () => {
    await getRequestById(id);
    setShowEditReceiverModal(false);
  };

  if (loading || !currentRequest) {
    return <LoadingScreen />;
  }

  const status = currentRequest.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  const canCancel = status === "pending" || status === "accepted";
  const isAccepted =
    status === "accepted" || status === "picked_up" || status === "delivered";

  const categoryConfig =
    CATEGORY_CONFIG[currentRequest.category as keyof typeof CATEGORY_CONFIG];

  // Trip / traveller data
  const tripData = currentRequest.trip as any;
  const travellerInfo = tripData?.traveller || null;
  const transportMode = tripData?.transport_mode || "";

  const pickupExpiryText =
    currentRequest.pickup_otp_expiry != null
      ? formatCountdown(currentRequest.pickup_otp_expiry).text
      : null;

  const deliveryExpiryText =
    currentRequest.delivery_otp_expiry != null
      ? formatCountdown(currentRequest.delivery_otp_expiry).text
      : null;

  // Expiry text for cancellation OTP card
  const cancellationExpiryText =
    currentRequest.cancellation_otp_expiry != null
      ? formatCountdown(currentRequest.cancellation_otp_expiry).text
      : null;

  return (
    <ScreenContainer>
      {/* Header */}
      <DetailScreenHeader
        title="Request Details"
        right={
          <StatusBadge
            icon={statusConfig.icon}
            label={statusConfig.label}
            color={statusColor}
          />
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Trip Route Card ── */}
        {currentRequest.trip && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <TripRouteCard
              source={currentRequest.trip.source}
              destination={currentRequest.trip.destination}
            />

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <TripScheduleGrid
              departureDate={currentRequest.trip.departure_date}
              departureTime={currentRequest.trip.departure_time}
              arrivalDate={currentRequest.trip.arrival_date}
              arrivalTime={currentRequest.trip.arrival_time}
            />

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <TripInfoRow
              transportMode={transportMode}
              parcelSizeCapacity={tripData?.parcel_size_capacity || "small"}
              capacityLabel="Trip Capacity"
            />

            {/* PNR + Ticket — only after acceptance */}
            {isAccepted && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.light },
                  ]}
                />
                <View style={styles.pnrRow}>
                  <Text
                    style={[styles.infoLabel, { color: colors.text.tertiary }]}
                  >
                    PNR
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.text.primary }]}
                  >
                    {tripData?.pnr_number ?? "—"}
                  </Text>
                </View>

                {tripData?.ticket_file_url && (
                  <Pressable
                    style={[
                      styles.ticketButton,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                    onPress={() => handleOpenTicket(tripData.ticket_file_url)}
                  >
                    <Ionicons
                      name="document-text"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.ticketButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      View Ticket
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Parcel Details Card ── */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          {/* Section header with optional Edit button */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Parcel Details
            </Text>
            {canEditDetails && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditDetailsModal(true);
                }}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          {/* Description box */}
          <View
            style={[
              styles.descriptionBox,
              { backgroundColor: colors.background.primary },
            ]}
          >
            <Text
              style={[styles.descriptionLabel, { color: colors.text.tertiary }]}
            >
              Description
            </Text>
            <Text
              style={[styles.descriptionText, { color: colors.text.primary }]}
            >
              {currentRequest.item_description}
            </Text>
          </View>

          {/* Category chip */}
          <View style={styles.categoryRow}>
            <Text
              style={[styles.categoryLabel, { color: colors.text.tertiary }]}
            >
              Category
            </Text>
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Ionicons
                name={categoryConfig?.icon || "cube-outline"}
                size={16}
                color={colors.primary}
              />
              <Text
                style={[styles.categoryChipText, { color: colors.primary }]}
              >
                {categoryConfig?.label || currentRequest.category}
              </Text>
            </View>
          </View>

          {/* Photos */}
          {currentRequest.parcel_photos &&
            currentRequest.parcel_photos.length > 0 && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border.light },
                  ]}
                />
                <View style={styles.photosSection}>
                  <View style={styles.photosSectionHeader}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text.primary },
                      ]}
                    >
                      Parcel Photos
                    </Text>
                    <View
                      style={[
                        styles.photoCountBadge,
                        { backgroundColor: colors.primary + "10" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.photoCountText,
                          { color: colors.primary },
                        ]}
                      >
                        {currentRequest.parcel_photos.length}
                      </Text>
                    </View>
                  </View>
                  <PhotoGallery
                    photos={currentRequest.parcel_photos}
                    mode="thumbnail"
                    thumbnailSize={80}
                  />
                </View>
              </>
            )}
        </View>

        {/* ── Receiver Details Card ── */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Receiver Details
            </Text>
            {canEditReceiver && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  setShowEditReceiverModal(true);
                }}
                style={[
                  styles.editButton,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          <ContactCard
            name={currentRequest.delivery_contact_name}
            phone={currentRequest.delivery_contact_phone}
            iconColor={colors.primary}
          />
        </View>

        {/* ── Traveller Info Card (only when accepted) ── */}
        {isAccepted && travellerInfo && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Traveller
            </Text>

            <ContactCard
              name={travellerInfo.full_name}
              phone={travellerInfo.phone}
              iconColor={colors.primary}
            />
          </View>
        )}

        {/* ── Pickup OTP Card ── */}
        {status === "accepted" && currentRequest.pickup_otp && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <OtpCard
              title="Pickup OTP"
              otp={currentRequest.pickup_otp}
              expiryText={pickupExpiryText}
              helperText="Share this OTP with the traveller only when they arrive for pickup."
              accentColor="primary"
              isRegenerating={regeneratingPickup}
              onRegenerate={handleRegeneratePickupOtp}
            />
          </View>
        )}

        {/* ── Delivery OTP Card ── */}
        {status === "picked_up" && currentRequest.delivery_otp && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <OtpCard
              title="Delivery OTP"
              otp={currentRequest.delivery_otp}
              expiryText={deliveryExpiryText}
              helperText="Share this OTP with the receiver to confirm parcel delivery."
              accentColor="success"
              isRegenerating={regeneratingDelivery}
              onRegenerate={handleRegenerateDeliveryOtp}
            />
          </View>
        )}

        {/* ── Cancellation OTP Card ── */}
        {status === "picked_up" &&
          currentRequest.cancellation_otp != null &&
          currentRequest.cancellation_otp_expiry != null &&
          new Date(currentRequest.cancellation_otp_expiry) > new Date() && (
            <View
              style={[
                styles.mainCard,
                {
                  backgroundColor: colors.error + "10",
                  borderWidth: 1,
                  borderColor: colors.error + "30",
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.error }]}>
                Cancellation OTP
              </Text>

              <View
                style={[
                  styles.otpBox,
                  { backgroundColor: colors.background.primary },
                ]}
              >
                <Text style={[styles.otpCode, { color: colors.text.primary }]}>
                  {currentRequest.cancellation_otp}
                </Text>
                {cancellationExpiryText && (
                  <Text
                    style={[styles.otpExpiry, { color: colors.text.secondary }]}
                  >
                    {cancellationExpiryText}
                  </Text>
                )}
              </View>

              <Text
                style={[styles.helperText, { color: colors.text.secondary }]}
              >
                The traveller has requested to cancel this trip. Share this OTP
                with them only if you agree to the cancellation.
              </Text>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.error + "20" },
                ]}
              />

              {/* Warning notice */}
              <View
                style={[
                  styles.warningNotice,
                  {
                    backgroundColor: colors.warning + "10",
                    borderColor: colors.warning + "30",
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={colors.warning}
                />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Sharing this OTP will cancel your request and the trip. This
                  cannot be undone.
                </Text>
              </View>
            </View>
          )}

        {/* ── Alert Card — rejected / cancelled reason ── */}
        {(status === "rejected" || status === "cancelled") &&
          currentRequest.rejection_reason && (
            <AlertCard
              title={
                status === "rejected" ? "Request Rejected" : "Request Cancelled"
              }
              message={currentRequest.rejection_reason}
            />
          )}

        {/* ── Cancel Button ── */}
        {canCancel && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.error },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                haptics.light();
                setShowCancelModal(true);
              }}
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={colors.text.inverse}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Cancel Request
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <CancelRequestModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancel={handleCancel}
        requestStatus={status}
      />

      <EditRequestDetailsModal
        visible={showEditDetailsModal}
        onClose={() => setShowEditDetailsModal(false)}
        request={currentRequest}
        allowedCategories={tripData?.allowed_categories || []}
        onSuccess={handleEditDetailsSuccess}
      />

      <EditReceiverDetailsModal
        visible={showEditReceiverModal}
        onClose={() => setShowEditReceiverModal(false)}
        request={currentRequest}
        onSuccess={handleEditReceiverSuccess}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  mainCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  pnrRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  ticketButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  editButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  descriptionBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  descriptionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  categoryChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  photosSection: {
    marginBottom: Spacing.xs,
  },
  photosSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  photoCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  photoCountText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  otpBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  otpCode: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 8,
  },
  otpExpiry: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  helperText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
    marginBottom: Spacing.xs,
  },
  warningNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: Typography.sizes.xs * 1.5,
  },
  actionsContainer: {
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
  },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
