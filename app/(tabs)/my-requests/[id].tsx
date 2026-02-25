// app/(tabs)/my-requests/[id].tsx
import CancelRequestModal from "@/components/request/CancelRequestModal";
import EditReceiverDetailsModal from "@/components/request/EditReceiverDetailsModal";
import EditRequestDetailsModal from "@/components/request/EditRequestDetailsModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { BackButton } from "@/components/shared";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import {
  getSizeCapacityIcon,
  getSizeCapacityLabel,
} from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS } from "@/lib/constants/transport";
import { showErrorAlert } from "@/lib/utils/alerts";
import { formatCountdown, formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import { useRequestStore } from "@/stores/requestStore";
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

  const handleCallTraveller = (phone: string) => {
    haptics.light();
    Linking.openURL(`tel:${phone}`);
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
        </View>
      </SafeAreaView>
    );
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
  const transportIcon =
    TRANSPORT_ICONS[transportMode as keyof typeof TRANSPORT_ICONS] ??
    "car-outline";
  const sizeCapacityLabel = getSizeCapacityLabel(
    tripData?.parcel_size_capacity || "",
  );

  const pickupExpiryText =
    currentRequest.pickup_otp_expiry != null
      ? formatCountdown(currentRequest.pickup_otp_expiry).text
      : null;

  const deliveryExpiryText =
    currentRequest.delivery_otp_expiry != null
      ? formatCountdown(currentRequest.delivery_otp_expiry).text
      : null;

  // FIX (Issue #25): Expiry text for cancellation OTP card
  const cancellationExpiryText =
    currentRequest.cancellation_otp_expiry != null
      ? formatCountdown(currentRequest.cancellation_otp_expiry).text
      : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Request Details
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}
        >
          <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

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
            {/* Route */}
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
                    {currentRequest.trip.source}
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
                    {currentRequest.trip.destination}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            {/* Schedule Grid */}
            <View style={styles.scheduleGrid}>
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
                    {formatDate(currentRequest.trip.departure_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(currentRequest.trip.departure_time)}
                  </Text>
                </View>
              </View>
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
                    {formatDate(currentRequest.trip.arrival_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(currentRequest.trip.arrival_time)}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            {/* Info Row — Transport + Capacity */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.primary + "10" },
                  ]}
                >
                  <Ionicons
                    name={transportIcon}
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
                    {transportMode
                      ? transportMode.charAt(0).toUpperCase() +
                        transportMode.slice(1)
                      : "—"}
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
                    name={getSizeCapacityIcon(
                      tripData?.parcel_size_capacity || "small",
                    )}
                    size={18}
                    color={colors.success}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.infoLabel, { color: colors.text.tertiary }]}
                  >
                    Trip Capacity
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: colors.text.primary }]}
                  >
                    {sizeCapacityLabel}
                  </Text>
                </View>
              </View>
            </View>

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

          <View
            style={[
              styles.contactCard,
              { backgroundColor: colors.background.primary },
            ]}
          >
            <View style={styles.contactInfo}>
              <Text
                style={[styles.contactName, { color: colors.text.primary }]}
              >
                {currentRequest.delivery_contact_name}
              </Text>
              <Text
                style={[styles.contactPhone, { color: colors.text.secondary }]}
              >
                {currentRequest.delivery_contact_phone}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Traveller Info Card (only when accepted) ── */}
        {isAccepted && travellerInfo && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Traveller
              </Text>
              {travellerInfo.phone && (
                <Pressable
                  onPress={() => handleCallTraveller(travellerInfo.phone)}
                  style={[
                    styles.callButton,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text
                    style={[styles.callButtonText, { color: colors.primary }]}
                  >
                    Call
                  </Text>
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.contactCard,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <View style={styles.contactInfo}>
                <Text
                  style={[styles.contactName, { color: colors.text.primary }]}
                >
                  {travellerInfo.full_name}
                </Text>
                <Text
                  style={[
                    styles.contactPhone,
                    { color: colors.text.secondary },
                  ]}
                >
                  {travellerInfo.phone}
                </Text>
              </View>
            </View>
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
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Pickup OTP
            </Text>

            <View
              style={[
                styles.otpBox,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <Text style={[styles.otpCode, { color: colors.text.primary }]}>
                {currentRequest.pickup_otp}
              </Text>
              {pickupExpiryText && (
                <Text
                  style={[styles.otpExpiry, { color: colors.text.secondary }]}
                >
                  {pickupExpiryText}
                </Text>
              )}
            </View>

            <Text style={[styles.helperText, { color: colors.text.secondary }]}>
              Share this OTP with the traveller only when they arrive for
              pickup.
            </Text>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <Pressable
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.primary + "10" },
                regeneratingPickup && styles.buttonDisabled,
              ]}
              onPress={handleRegeneratePickupOtp}
              disabled={regeneratingPickup}
            >
              {regeneratingPickup ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.primary} />
              )}
              <Text
                style={[styles.secondaryButtonText, { color: colors.primary }]}
              >
                {regeneratingPickup ? "Regenerating…" : "Regenerate OTP"}
              </Text>
            </Pressable>
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
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Delivery OTP
            </Text>

            <View
              style={[
                styles.otpBox,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <Text style={[styles.otpCode, { color: colors.text.primary }]}>
                {currentRequest.delivery_otp}
              </Text>
              {deliveryExpiryText && (
                <Text
                  style={[styles.otpExpiry, { color: colors.text.secondary }]}
                >
                  {deliveryExpiryText}
                </Text>
              )}
            </View>

            <Text style={[styles.helperText, { color: colors.text.secondary }]}>
              Share this OTP with the receiver to confirm parcel delivery.
            </Text>

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            <Pressable
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.success + "10" },
                regeneratingDelivery && styles.buttonDisabled,
              ]}
              onPress={handleRegenerateDeliveryOtp}
              disabled={regeneratingDelivery}
            >
              {regeneratingDelivery ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <Ionicons name="refresh" size={18} color={colors.success} />
              )}
              <Text
                style={[styles.secondaryButtonText, { color: colors.success }]}
              >
                {regeneratingDelivery ? "Regenerating…" : "Regenerate OTP"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Cancellation OTP Card (Issue #25) ── */}
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
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.error + "10",
                  borderColor: colors.error + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.alertIconContainer,
                  { backgroundColor: colors.error + "20" },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={colors.error} />
              </View>
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: colors.error }]}>
                  {status === "rejected"
                    ? "Request Rejected"
                    : "Request Cancelled"}
                </Text>
                <Text
                  style={[styles.alertText, { color: colors.text.primary }]}
                >
                  {currentRequest.rejection_reason}
                </Text>
              </View>
            </View>
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
  },
  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  // ── Main Card ── identical to requests/[id].tsx
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
  // ── Divider ──
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  // ── Route ──
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
  // ── Schedule Grid ──
  scheduleGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  // ── Info Row ──
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
  // ── PNR ──
  pnrRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
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
  // ── Section Header Row ──
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
  // ── Parcel section ──
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
  // ── Contact Card (receiver / traveller) ──
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: Typography.sizes.sm,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  callButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  // ── OTP Cards ──
  otpBox: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  otpCode: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 4,
  },
  otpExpiry: {
    fontSize: Typography.sizes.sm,
  },
  helperText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  secondaryButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // ── Warning Notice (cancellation OTP) ──
  warningNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  // ── Alert Card (rejected / cancelled) ──
  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  alertText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  // ── Action Button (cancel) ──
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
