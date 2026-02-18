// app/(tabs)/requests/[id].tsx
import AcceptRequestModal from "@/components/modals/AcceptRequestModal";
import RejectRequestModal from "@/components/modals/RejectRequestModal";
import VerifyOtpModal from "@/components/modals/VerifyOtpModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG } from "@/lib/constants/categories";
import {
  getSizeCapacityIcon,
  getSizeCapacityLabel,
} from "@/lib/constants/parcel";
import { REQUEST_STATUS_CONFIG, RequestStatus } from "@/lib/constants/status";
import { TRANSPORT_ICONS, TransportMode } from "@/lib/constants/transport";
import { formatDate, formatTime } from "@/lib/utils/dateTime";
import { haptics } from "@/lib/utils/haptics";
import { useRequestStore } from "@/stores/requestStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const handleCall = (phone: string) => {
    haptics.light();
    Linking.openURL(`tel:${phone}`);
  };

  const handleAccept = async () => {
    try {
      await acceptRequest(id);
      haptics.success();
      Alert.alert("Request Accepted!", "The sender has been notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to accept request");
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectRequest(id, reason);
      haptics.success();
      Alert.alert("Request Rejected", "The sender has been notified.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      haptics.error();
      Alert.alert("Error", error.message || "Failed to reject request");
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
        Alert.alert("Success", "Parcel marked as picked up!");
        await getRequestById(id);
      }
      return isValid;
    } catch (error) {
      console.error("Verify pickup OTP failed:", error);
      throw error;
    }
  };

  const handleVerifyDeliveryOtp = async (otp: string): Promise<boolean> => {
    try {
      const isValid = await verifyDeliveryOtp(id, otp);
      if (isValid) {
        setDeliveryOtpModalVisible(false);
        Alert.alert("Success", "Parcel marked as delivered!");
        await getRequestById(id);
      }
      return isValid;
    } catch (error) {
      console.error("Verify delivery OTP failed:", error);
      throw error;
    }
  };

  const handleBack = () => {
    haptics.light();
    router.back();
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

  const capacityLabel = request.trip?.parcel_size_capacity
    ? getSizeCapacityLabel(request.trip.parcel_size_capacity)
    : "Unknown";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header — matches trip-preview.tsx exactly */}
      <View style={styles.header}>
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
            Request Details
          </Text>
        </View>
      </View>

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
          {/* Status Banner */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: statusColor + "15" },
            ]}
          >
            <Ionicons name={statusConfig.icon} size={16} color={statusColor} />
            <Text style={[styles.statusBannerText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Route — mirrors trip-preview.tsx routeContainer */}
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
                  {request.trip?.source ?? "—"}
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
                  {request.trip?.destination ?? "—"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Schedule Grid — departure + arrival, mirrors trip-preview.tsx */}
          {request.trip && (
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
                    {formatDate(request.trip.departure_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(request.trip.departure_time)}
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
                    {formatDate(request.trip.arrival_date)}
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatTime(request.trip.arrival_time)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View
            style={[styles.divider, { backgroundColor: colors.border.light }]}
          />

          {/* Trip Info Row — transport + capacity, mirrors trip-preview.tsx infoRow */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name={
                    TRANSPORT_ICONS[
                      request.trip?.transport_mode as TransportMode
                    ] ?? "car-outline"
                  }
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
                  {request.trip?.transport_mode
                    ? request.trip.transport_mode.charAt(0).toUpperCase() +
                      request.trip.transport_mode.slice(1)
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
                    request.trip?.parcel_size_capacity || "small",
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
                  {capacityLabel}
                </Text>
              </View>
            </View>
          </View>

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

        {/* ── Privacy Notice (only when pending, outside main card) ── */}
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

        {/* ── Contact Cards (only when canViewContacts) ── */}
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
                  onCall={() => handleCall(request.sender!.phone)}
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
              onCall={() => handleCall(request.delivery_contact_phone)}
              iconColor={colors.success}
            />
          </View>
        )}

        {/* ── Alert Card (cancelled / rejected reason) ── */}
        {(isCancelled || (isRejected && request.rejection_reason)) && (
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
                {isCancelled
                  ? `Cancelled by ${request.cancelled_by === "sender" ? "Sender" : "You"}`
                  : "Request Rejected"}
              </Text>
              <Text style={[styles.alertText, { color: colors.text.primary }]}>
                {request.rejection_reason}
              </Text>
            </View>
          </View>
        )}

        {/* ── Action Buttons — bottom of scroll, NO footer styling ── */}
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

      {/* Modals — unchanged */}
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
    </SafeAreaView>
  );
}

// ── ContactCard helper ── unchanged logic, updated style usage
function ContactCard({
  name,
  phone,
  onCall,
  iconColor,
}: {
  name: string;
  phone: string;
  onCall: () => void;
  iconColor: string;
}) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.contactCard,
        { backgroundColor: colors.background.primary },
      ]}
    >
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text.primary }]}>
          {name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.text.secondary }]}>
          {phone}
        </Text>
      </View>
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[styles.callButton, { backgroundColor: iconColor + "15" }]}
          onPress={onCall}
          onPressIn={() => {
            scale.value = withSpring(0.9);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
        >
          <Ionicons name="call" size={20} color={iconColor} />
        </Pressable>
      </Animated.View>
    </View>
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
  // ── Header — identical to trip-preview.tsx ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    // no borderBottomWidth — matches trip-preview
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
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  // ── Main Card — identical to trip-preview.tsx mainCard ──
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
  // ── Status Banner ──
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  statusBannerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  // ── Divider — identical to trip-preview.tsx ──
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  // ── Route — identical to trip-preview.tsx ──
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
  // ── Schedule Grid — identical to trip-preview.tsx ──
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
  // ── Info Row — identical to trip-preview.tsx ──
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
  // ── Parcel Section ──
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
  // ── Category Chip — identical to trip-preview.tsx ──
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
  // ── Photos Section ──
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
  // ── Privacy Notice ──
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
  // ── Contact Cards ──
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Alert Card ──
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
