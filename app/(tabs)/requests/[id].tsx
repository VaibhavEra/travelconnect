import AcceptRequestModal from "@/components/modals/AcceptRequestModal";
import RejectRequestModal from "@/components/modals/RejectRequestModal";
import VerifyOtpModal from "@/components/modals/VerifyOtpModal";
import PhotoGallery from "@/components/request/PhotoGallery";
import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
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
  FadeIn,
  FadeInDown,
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

  const handleAccept = async (notes?: string) => {
    try {
      await acceptRequest(id, notes);
      haptics.success();
      Alert.alert("Request Accepted! 🎉", "The sender has been notified.", [
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

  const handleVerifyPickupOtp = async (otp: string) => {
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

  const handleVerifyDeliveryOtp = async (otp: string) => {
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
          styles.loadingContainer,
          { backgroundColor: colors.background.primary },
        ]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading request...
        </Text>
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
  const sizeConfig = SIZE_CONFIG[request.size as keyof typeof SIZE_CONFIG];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* FIXED: Header with status and left-aligned title */}
      <Animated.View
        entering={FadeIn}
        style={[styles.header, { borderBottomColor: colors.border.light }]}
      >
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
          {/* Status in header */}
          <View style={styles.statusBadge}>
            <Ionicons name={statusConfig.icon} size={14} color={statusColor} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Notice */}
        {isPending && (
          <Animated.View
            entering={FadeInDown.delay(100)}
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
          </Animated.View>
        )}

        {/* FIXED: Parcel Details BEFORE Photos */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={[
            styles.card,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIconContainer,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="cube" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Parcel Information
            </Text>
          </View>

          {/* Description */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.background.primary },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
              Description
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {request.item_description}
            </Text>
          </View>

          {/* Category & Size */}
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                Category
              </Text>
              <View
                style={[
                  styles.detailChip,
                  { backgroundColor: colors.primary + "10" },
                ]}
              >
                <Ionicons
                  name={categoryConfig.icon}
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.detailChipText, { color: colors.primary }]}
                >
                  {categoryConfig.label}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text
                style={[styles.detailLabel, { color: colors.text.tertiary }]}
              >
                Size
              </Text>
              <View
                style={[
                  styles.detailChip,
                  { backgroundColor: colors.background.primary },
                ]}
              >
                <Ionicons
                  name={sizeConfig.icon}
                  size={16}
                  color={colors.text.secondary}
                />
                <Text
                  style={[
                    styles.detailChipText,
                    { color: colors.text.secondary },
                  ]}
                >
                  {sizeConfig.label}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* FIXED: Parcel Photos - Using PhotoGallery with thumbnail mode */}
        {request.parcel_photos && request.parcel_photos.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(300)}
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="images" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Parcel Photos
              </Text>
              <View
                style={[
                  styles.photoCount,
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
          </Animated.View>
        )}

        {/* FIXED: Trip Info with Departure AND Arrival */}
        {request.trip && (
          <Animated.View
            entering={FadeInDown.delay(400)}
            style={[
              styles.card,
              { backgroundColor: colors.background.secondary },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIconContainer,
                  { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Ionicons name="airplane" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                Your Trip
              </Text>
            </View>

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
                    Departure
                  </Text>
                  <Text
                    style={[styles.routeCity, { color: colors.text.primary }]}
                  >
                    {request.trip.source}
                  </Text>
                  <Text
                    style={[
                      styles.routeDateTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatDate(request.trip.departure_date)} •{" "}
                    {formatTime(request.trip.departure_time)}
                  </Text>
                </View>
              </View>

              <View style={styles.routeLineContainer}>
                <View
                  style={[
                    styles.routeLine,
                    { backgroundColor: colors.border.default },
                  ]}
                />
                <View
                  style={[
                    styles.transportBadge,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name={
                      TRANSPORT_ICONS[
                        request.trip.transport_mode as TransportMode
                      ] || "car"
                    }
                    size={14}
                    color={colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.routeLine,
                    { backgroundColor: colors.border.default },
                  ]}
                />
              </View>

              <View style={styles.routePoint}>
                <View
                  style={[styles.routeDot, { backgroundColor: colors.success }]}
                />
                <View style={styles.routeInfo}>
                  <Text
                    style={[styles.routeLabel, { color: colors.text.tertiary }]}
                  >
                    Arrival
                  </Text>
                  <Text
                    style={[styles.routeCity, { color: colors.text.primary }]}
                  >
                    {request.trip.destination}
                  </Text>
                  <Text
                    style={[
                      styles.routeDateTime,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {formatDate(request.trip.arrival_date)} •{" "}
                    {formatTime(request.trip.arrival_time)}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* FIXED: Contact Cards - Only visible after accept */}
        {canViewContacts && (
          <>
            {/* Sender Info */}
            {request.sender && (
              <Animated.View
                entering={FadeInDown.delay(500)}
                style={[
                  styles.card,
                  { backgroundColor: colors.background.secondary },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardIconContainer,
                      { backgroundColor: colors.primary + "15" },
                    ]}
                  >
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.cardTitle, { color: colors.text.primary }]}
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
              </Animated.View>
            )}

            {/* Receiver Info */}
            <Animated.View
              entering={FadeInDown.delay(600)}
              style={[
                styles.card,
                { backgroundColor: colors.background.secondary },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconContainer,
                    { backgroundColor: colors.success + "15" },
                  ]}
                >
                  <Ionicons name="location" size={20} color={colors.success} />
                </View>
                <Text
                  style={[styles.cardTitle, { color: colors.text.primary }]}
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
            </Animated.View>
          </>
        )}

        {/* Alert Cards */}
        {(isCancelled || isRejected) && request.rejection_reason && (
          <Animated.View
            entering={FadeInDown.delay(700)}
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
          </Animated.View>
        )}

        {(isAccepted || isPickedUp) && request.traveller_notes && (
          <Animated.View
            entering={FadeInDown.delay(700)}
            style={[
              styles.alertCard,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <View
              style={[
                styles.alertIconContainer,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.primary }]}>
                Your Notes
              </Text>
              <Text style={[styles.alertText, { color: colors.text.primary }]}>
                {request.traveller_notes}
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxxl * 2 }} />
      </ScrollView>

      {/* FIXED: Action Buttons */}
      {isPending && (
        <Animated.View
          entering={FadeIn.delay(800)}
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.error }]}
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
              style={[styles.actionButtonText, { color: colors.text.inverse }]}
            >
              Reject
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.acceptButton,
              { backgroundColor: colors.success },
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
              style={[styles.actionButtonText, { color: colors.text.inverse }]}
            >
              Accept Request
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* FIXED: Mark as Picked Up button in details page */}
      {isAccepted && (
        <Animated.View
          entering={FadeIn.delay(800)}
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <Pressable
            style={[
              styles.actionButton,
              styles.fullWidthButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleMarkPickup}
          >
            <Ionicons name="cube" size={22} color={colors.text.inverse} />
            <Text
              style={[styles.actionButtonText, { color: colors.text.inverse }]}
            >
              Mark as Picked Up
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* FIXED: Mark as Delivered button in details page */}
      {isPickedUp && (
        <Animated.View
          entering={FadeIn.delay(800)}
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <Pressable
            style={[
              styles.actionButton,
              styles.fullWidthButton,
              { backgroundColor: colors.success },
            ]}
            onPress={handleMarkDelivery}
          >
            <Ionicons
              name="checkmark-done"
              size={22}
              color={colors.text.inverse}
            />
            <Text
              style={[styles.actionButtonText, { color: colors.text.inverse }]}
            >
              Mark as Delivered
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Modals */}
      <AcceptRequestModal
        visible={acceptModalVisible}
        onClose={() => setAcceptModalVisible(false)}
        onAccept={handleAccept}
        senderName={request.sender?.full_name || "Sender"}
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
        otpExpiry={request.pickup_otp_expiry || ""}
      />

      <VerifyOtpModal
        visible={deliveryOtpModalVisible}
        onClose={() => setDeliveryOtpModalVisible(false)}
        onVerify={handleVerifyDeliveryOtp}
        type="delivery"
        userName={request.delivery_contact_name}
        otpExpiry={request.delivery_otp_expiry || ""}
      />
    </SafeAreaView>
  );
}

// Helper Component
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
          onPressIn={() => (scale.value = withSpring(0.9))}
          onPressOut={() => (scale.value = withSpring(1))}
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
  privacyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
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
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  photoCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  photoCountText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  infoBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  detailRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  detailChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
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
  routeContainer: {
    gap: Spacing.xs,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  routeCity: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  routeDateTime: {
    fontSize: Typography.sizes.sm,
  },
  routeLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5,
    marginVertical: Spacing.xs,
  },
  routeLine: {
    width: 2,
    height: 16,
  },
  transportBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.xs,
  },
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
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
