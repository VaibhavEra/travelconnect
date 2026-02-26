// app/(tabs)/requests/[id].tsx
import AcceptRequestModal from "@/components/modals/AcceptRequestModal";
import RejectRequestModal from "@/components/modals/RejectRequestModal";
import VerifyOtpModal from "@/components/modals/VerifyOtpModal";
import ContactCard from "@/components/request/ContactCard";
import PhotoGallery from "@/components/request/PhotoGallery";
import {
  AlertCard,
  DetailScreenHeader,
  LoadingScreen,
  ScreenContainer,
  StatusBadge,
} from "@/components/shared";
import TripInfoRow from "@/components/trip/TripInfoRow";
import TripRouteCard from "@/components/trip/TripRouteCard";
import TripScheduleGrid from "@/components/trip/TripScheduleGrid";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { showErrorAlert, showSessionAlert } from "@/lib/utils/alerts";
import { haptics } from "@/lib/utils/haptics";
import { logger } from "@/lib/utils/logger";
import { showSuccessToast } from "@/lib/utils/toast";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const MODULE = "IncomingRequestDetailsScreen";

export default function IncomingRequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentRequest,
    loading,
    getRequestById,
    acceptRequest,
    rejectRequest,
    verifyPickupOtp,
    verifyDeliveryOtp,
  } = useRequestStore();

  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [pickupOtpModalVisible, setPickupOtpModalVisible] = useState(false);
  const [deliveryOtpModalVisible, setDeliveryOtpModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      getRequestById(id);
    }
  }, [id]);

  const handleAccept = async () => {
    try {
      await acceptRequest(id);
      haptics.success();
      showSessionAlert(
        "Request Accepted!",
        "The sender has been notified.",
        () => router.back(),
      );
    } catch (error) {
      haptics.error();
      logger.error("Failed to accept request", error, { module: MODULE });
      showErrorAlert(error);
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectRequest(id, reason);
      haptics.success();
      showSessionAlert(
        "Request Rejected",
        "The sender has been notified.",
        () => router.back(),
      );
    } catch (error) {
      haptics.error();
      logger.error("Failed to reject request", error, { module: MODULE });
      showErrorAlert(error);
    }
  };

  const handleMarkPickup = () => {
    haptics.light();
    setPickupOtpModalVisible(true);
  };

  const handleMarkDelivery = () => {
    haptics.light();
    setDeliveryOtpModalVisible(true);
  };

  const handleVerifyPickupOtp = async (otp: string): Promise<boolean> => {
    try {
      const isValid = await verifyPickupOtp(id, otp);
      if (isValid) {
        setPickupOtpModalVisible(false);
        showSuccessToast("Parcel marked as picked up!");
        await getRequestById(id);
      }
      return isValid;
    } catch (error) {
      logger.error("Verify pickup OTP failed", error, { module: MODULE });
      throw error;
    }
  };

  const handleVerifyDeliveryOtp = async (otp: string): Promise<boolean> => {
    try {
      const isValid = await verifyDeliveryOtp(id, otp);
      if (isValid) {
        setDeliveryOtpModalVisible(false);
        showSuccessToast("Parcel marked as delivered!");
        await getRequestById(id);
      }
      return isValid;
    } catch (error) {
      logger.error("Verify delivery OTP failed", error, { module: MODULE });
      throw error;
    }
  };

  if (loading || !currentRequest) {
    return <LoadingScreen />;
  }

  const request = currentRequest;
  const status = request.status as RequestStatus;
  const statusConfig = REQUEST_STATUS_CONFIG[status];
  const statusColor = colors[statusConfig.colorKey];

  const isPending = status === "pending";
  const isAccepted = status === "accepted";
  const isPickedUp = status === "picked_up";
  const isCancelled = status === "cancelled";
  const isRejected = status === "rejected";

  const canViewContacts = isAccepted || isPickedUp || isCancelled || isRejected;

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];

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
        {/* ── Main Card ── */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <TripRouteCard
            source={request.trip?.source ?? "—"}
            destination={request.trip?.destination ?? "—"}
          />

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {request.trip && (
            <TripScheduleGrid
              departureDate={request.trip.departure_date}
              departureTime={request.trip.departure_time}
              arrivalDate={request.trip.arrival_date}
              arrivalTime={request.trip.arrival_time}
            />
          )}

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          <TripInfoRow
            transportMode={request.trip?.transport_mode ?? ""}
            parcelSizeCapacity={request.trip?.parcel_size_capacity || "small"}
            capacityLabel="Trip Capacity"
          />

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Parcel Details */}
          <View style={styles.parcelSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Parcel Details
            </Text>

            {/* Description box */}
            <View
              style={[
                styles.descriptionBox,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <Text
                style={[
                  styles.descriptionLabel,
                  { color: colors.text.tertiary },
                ]}
              >
                Description
              </Text>
              <Text
                style={[styles.descriptionText, { color: colors.text.primary }]}
              >
                {request.item_description}
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
                <Text style={[styles.categoryText, { color: colors.primary }]}>
                  {categoryConfig?.label || request.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Parcel Photos (inside main card, separated by divider) */}
          {request.parcel_photos && request.parcel_photos.length > 0 && (
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
                      style={[styles.photoCountText, { color: colors.primary }]}
                    >
                      {request.parcel_photos.length}
                    </Text>
                  </View>
                </View>
                <PhotoGallery
                  photos={request.parcel_photos}
                  mode="thumbnail"
                  thumbnailSize={80}
                />
              </View>
            </>
          )}
        </View>

        {/* ── Privacy Notice ── */}
        {isPending && (
          <View
            style={[
              styles.privacyNotice,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <View
              style={[
                styles.privacyIconContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Ionicons name="lock-closed" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.privacyText, { color: colors.primary }]}>
              Contact details will be visible after acceptance
            </Text>
          </View>
        )}

        {/* ── Contact Cards ── */}
        {canViewContacts && (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            {/* Sender */}
            {request.sender && (
              <>
                <View style={styles.contactSectionHeader}>
                  <View
                    style={[
                      styles.contactSectionIcon,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <Ionicons name="person" size={18} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.text.primary },
                    ]}
                  >
                    Sender
                  </Text>
                </View>
                <ContactCard
                  name={request.sender.full_name}
                  phone={request.sender.phone}
                  iconColor={colors.primary}
                />
              </>
            )}

            <View
              style={[styles.divider, { backgroundColor: colors.border.light }]}
            />

            {/* Receiver */}
            <View style={styles.contactSectionHeader}>
              <View
                style={[
                  styles.contactSectionIcon,
                  { backgroundColor: colors.success + "15" },
                ]}
              >
                <Ionicons name="location" size={18} color={colors.success} />
              </View>
              <Text
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Receiver
              </Text>
            </View>
            <ContactCard
              name={request.delivery_contact_name}
              phone={request.delivery_contact_phone}
              iconColor={colors.success}
            />
          </View>
        )}

        {/* ── Alert Card ── */}
        {(isCancelled || (isRejected && request.rejection_reason)) && (
          <AlertCard
            title={
              isCancelled
                ? `Cancelled by ${request.cancelled_by === "sender" ? "Sender" : "You"}`
                : "Request Rejected"
            }
            message={request.rejection_reason ?? ""}
          />
        )}

        {/* ── Action Buttons ── */}
        {isPending && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.error },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                haptics.light();
                setRejectModalVisible(true);
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
                Reject
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.acceptButton,
                { backgroundColor: colors.success },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                haptics.light();
                setAcceptModalVisible(true);
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.text.inverse}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Accept Request
              </Text>
            </Pressable>
          </View>
        )}

        {isAccepted && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.fullWidthButton,
                { backgroundColor: colors.primary },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleMarkPickup}
            >
              <Ionicons name="cube" size={22} color={colors.text.inverse} />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Mark as Picked Up
              </Text>
            </Pressable>
          </View>
        )}

        {isPickedUp && (
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.fullWidthButton,
                { backgroundColor: colors.success },
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleMarkDelivery}
            >
              <Ionicons
                name="checkmark-done"
                size={22}
                color={colors.text.inverse}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.text.inverse },
                ]}
              >
                Mark as Delivered
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <AcceptRequestModal
        visible={acceptModalVisible}
        onClose={() => setAcceptModalVisible(false)}
        onAccept={handleAccept}
        senderName={request.sender?.full_name || "Sender"}
        category={request.category}
        tripCapacity={request.trip?.parcel_size_capacity || "small"}
      />
      <RejectRequestModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onReject={handleReject}
        senderName={request.sender?.full_name || "Sender"}
      />
      <VerifyOtpModal
        visible={pickupOtpModalVisible}
        onClose={() => setPickupOtpModalVisible(false)}
        onVerify={handleVerifyPickupOtp}
        type="pickup"
        userName={request.sender?.full_name || "Sender"}
        otpExpiry={request.pickup_otp_expiry ?? undefined}
        failedAttempts={request.failed_pickup_attempts}
        blockedUntil={request.pickup_blocked_until}
      />
      <VerifyOtpModal
        visible={deliveryOtpModalVisible}
        onClose={() => setDeliveryOtpModalVisible(false)}
        onVerify={handleVerifyDeliveryOtp}
        type="delivery"
        userName={request.delivery_contact_name}
        otpExpiry={request.delivery_otp_expiry ?? undefined}
        failedAttempts={request.failed_delivery_attempts}
        blockedUntil={request.delivery_blocked_until}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
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
  parcelSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
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
  categoryText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  photosSection: {
    marginBottom: Spacing.md,
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
  privacyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  privacyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.sm * 1.4,
  },
  contactSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  contactSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Action Buttons — inside ScrollView, NO position absolute ──
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
  acceptButton: {
    flex: 1.5,
  },
  fullWidthButton: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
