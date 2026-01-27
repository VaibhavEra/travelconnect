import AcceptRequestModal from "@/components/modals/AcceptRequestModal";
import RejectRequestModal from "@/components/modals/RejectRequestModal";
import { CATEGORY_CONFIG, SIZE_CONFIG } from "@/lib/constants/categories";
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
  Image,
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

type RequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "picked_up"
  | "delivered"
  | "cancelled";

const STATUS_CONFIG: Record<
  RequestStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    getColor: (colors: any) => string;
  }
> = {
  pending: {
    label: "Pending Review",
    icon: "time",
    getColor: (colors) => colors.warning,
  },
  accepted: {
    label: "Accepted",
    icon: "checkmark-circle",
    getColor: (colors) => colors.success,
  },
  rejected: {
    label: "Rejected",
    icon: "close-circle",
    getColor: (colors) => colors.error,
  },
  picked_up: {
    label: "Picked Up",
    icon: "hand-left",
    getColor: (colors) => colors.primary,
  },
  delivered: {
    label: "Delivered",
    icon: "checkmark-done-circle",
    getColor: (colors) => colors.success,
  },
  cancelled: {
    label: "Cancelled",
    icon: "ban",
    getColor: (colors) => colors.text.tertiary,
  },
};

const TRANSPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  flight: "airplane",
  train: "train",
  bus: "bus",
  car: "car",
};

export default function IncomingRequestDetailsScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentRequest,
    loading,
    getRequestById,
    acceptRequest,
    rejectRequest,
  } = useRequestStore();
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

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
  const statusConfig = STATUS_CONFIG[status];
  const statusColor = statusConfig.getColor(colors);
  const isPending = status === "pending";
  const isAccepted = status === "accepted";
  const isCancelled = status === "cancelled";
  const isRejected = status === "rejected";
  const canViewContacts = isAccepted || isCancelled || isRejected;

  const categoryConfig =
    CATEGORY_CONFIG[request.category as keyof typeof CATEGORY_CONFIG];
  const sizeConfig = SIZE_CONFIG[request.size as keyof typeof SIZE_CONFIG];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      {/* Header */}
      <Animated.View entering={FadeIn} style={styles.header}>
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Request Details
        </Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[
            styles.statusBanner,
            {
              backgroundColor: statusColor + "15",
              borderColor: statusColor + "30",
            },
          ]}
        >
          <View
            style={[
              styles.statusIconContainer,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Ionicons name={statusConfig.icon} size={24} color={statusColor} />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusLabel, { color: colors.text.tertiary }]}>
              Status
            </Text>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </Animated.View>

        {/* Privacy Notice */}
        {isPending && (
          <Animated.View
            entering={FadeInDown.delay(200)}
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

        {/* Parcel Photos */}
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

            <Image
              source={{ uri: request.parcel_photos[selectedPhotoIndex] }}
              style={[
                styles.mainPhoto,
                { backgroundColor: colors.background.primary },
              ]}
            />

            {request.parcel_photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoThumbnails}
              >
                {request.parcel_photos.map((photo, index) => (
                  <PhotoThumbnail
                    key={index}
                    uri={photo}
                    isSelected={selectedPhotoIndex === index}
                    onPress={() => {
                      haptics.light();
                      setSelectedPhotoIndex(index);
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* Parcel Details */}
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

          {/* Sender Notes */}
          {request.sender_notes && (
            <View
              style={[
                styles.notesBox,
                {
                  backgroundColor: colors.warning + "10",
                  borderColor: colors.warning + "30",
                },
              ]}
            >
              <View style={styles.notesHeader}>
                <Ionicons
                  name="chatbox-ellipses"
                  size={16}
                  color={colors.warning}
                />
                <Text style={[styles.notesLabel, { color: colors.warning }]}>
                  Sender's Note
                </Text>
              </View>
              <Text style={[styles.notesText, { color: colors.text.primary }]}>
                {request.sender_notes}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Contact Cards */}
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

        {/* Trip Info */}
        {request.trip && (
          <Animated.View
            entering={FadeInDown.delay(700)}
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
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {request.trip.source}
                </Text>
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
                    name={TRANSPORT_ICONS[request.trip.transport_mode] || "car"}
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
                <Text
                  style={[styles.routeCity, { color: colors.text.primary }]}
                >
                  {request.trip.destination}
                </Text>
              </View>
            </View>

            {/* Date & Time */}
            <View
              style={[
                styles.tripInfoBox,
                { backgroundColor: colors.background.primary },
              ]}
            >
              <View style={styles.tripInfoRow}>
                <Ionicons
                  name="calendar"
                  size={18}
                  color={colors.text.secondary}
                />
                <Text
                  style={[styles.tripInfoText, { color: colors.text.primary }]}
                >
                  {new Date(request.trip.departure_date).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </Text>
              </View>
              <View style={styles.tripInfoRow}>
                <Ionicons name="time" size={18} color={colors.text.secondary} />
                <Text
                  style={[styles.tripInfoText, { color: colors.text.primary }]}
                >
                  {request.trip.departure_time}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Alert Cards */}
        {(isCancelled || isRejected) && request.rejection_reason && (
          <Animated.View
            entering={FadeInDown.delay(800)}
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

        {isAccepted && request.traveller_notes && (
          <Animated.View
            entering={FadeInDown.delay(800)}
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

      {/* Action Buttons */}
      {isPending && (
        <Animated.View
          entering={FadeIn.delay(900)}
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
    </SafeAreaView>
  );
}

// Helper Components
function PhotoThumbnail({
  uri,
  isSelected,
  onPress,
}: {
  uri: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image
          source={{ uri }}
          style={[
            styles.thumbnail,
            {
              backgroundColor: colors.background.primary,
              borderColor: isSelected ? colors.primary : colors.border.default,
              borderWidth: isSelected ? 2.5 : 1.5,
            },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  statusText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
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
  mainPhoto: {
    width: "100%",
    height: 280,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  photoThumbnails: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
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
    marginBottom: Spacing.md,
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
  notesBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  notesLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
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
  routeCity: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
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
  tripInfoBox: {
    flexDirection: "row",
    gap: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  tripInfoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  tripInfoText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
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
  actionButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
