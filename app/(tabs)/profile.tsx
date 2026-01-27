import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { useProfileStore } from "@/stores/profileStore";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { user, signOut } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);
  const { currentMode, switchMode } = useModeStore(); // FIXED: Use switchMode
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => haptics.light(),
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            haptics.success();
          } catch (error) {
            haptics.error();
            Alert.alert("Error", "Failed to sign out. Please try again.");
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleModeSwitch = async () => {
    haptics.selection();
    const newMode = currentMode === "sender" ? "traveller" : "sender";
    await switchMode(newMode); // FIXED: Use switchMode with await
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[
            styles.header,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={48} color={colors.text.inverse} />
            </View>
            <View
              style={[
                styles.verifiedBadge,
                { backgroundColor: colors.success },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={14}
                color={colors.text.inverse}
              />
            </View>
          </View>

          <Text style={[styles.name, { color: colors.text.primary }]}>
            {profile?.full_name || "User"}
          </Text>
          <Text style={[styles.username, { color: colors.text.secondary }]}>
            @{profile?.username || "username"}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.text.primary }]}>
              {profile?.rating?.toFixed(1) || "0.0"}
            </Text>
            <Text style={[styles.ratingCount, { color: colors.text.tertiary }]}>
              ({profile?.rating_count || 0} reviews)
            </Text>
          </View>
        </Animated.View>

        {/* Mode Switcher Button (Temporary) */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Pressable
            style={({ pressed }) => [
              styles.modeSwitcherButton,
              { backgroundColor: colors.primary },
              pressed && styles.modeSwitcherButtonPressed,
            ]}
            onPress={handleModeSwitch}
          >
            <Ionicons
              name={currentMode === "sender" ? "airplane" : "search"}
              size={20}
              color={colors.text.inverse}
            />
            <Text
              style={[styles.modeSwitcherText, { color: colors.text.inverse }]}
            >
              Switch to {currentMode === "sender" ? "Traveller" : "Sender"} Mode
            </Text>
          </Pressable>
        </Animated.View>

        {/* Current Mode Card */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={[
            styles.modeCard,
            {
              backgroundColor: colors.primary + "10",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <View style={styles.modeHeader}>
            <View
              style={[styles.modeIcon, { backgroundColor: colors.primary }]}
            >
              <Ionicons
                name={
                  currentMode === "sender"
                    ? "search-outline"
                    : "airplane-outline"
                }
                size={24}
                color={colors.text.inverse}
              />
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeLabel, { color: colors.primary }]}>
                Current Mode
              </Text>
              <Text style={[styles.modeText, { color: colors.primary }]}>
                {currentMode === "sender" ? "Sender" : "Traveller"}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.modeDescription, { color: colors.text.secondary }]}
          >
            {currentMode === "sender"
              ? "You can search trips and send packages"
              : "You can create trips and carry packages"}
          </Text>
        </Animated.View>

        {/* Profile Info Section */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={[
            styles.section,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Profile Information
          </Text>

          <InfoRow
            icon="mail"
            label="Email"
            value={user?.email || ""}
            colors={colors}
          />
          <InfoRow
            icon="call"
            label="Phone"
            value={profile?.phone || ""}
            colors={colors}
          />
          <InfoRow
            icon="calendar"
            label="Member Since"
            value={
              profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "Recently"
            }
            colors={colors}
          />
        </Animated.View>

        {/* Actions Section */}
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={[
            styles.section,
            { backgroundColor: colors.background.secondary },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Settings & Support
          </Text>

          <ActionButton
            icon="create-outline"
            label="Edit Profile"
            onPress={() => {
              haptics.light();
              // TODO: Navigate to edit profile
            }}
            colors={colors}
          />
          <ActionButton
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => {
              haptics.light();
              // TODO: Navigate to privacy settings
            }}
            colors={colors}
          />
          <ActionButton
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {
              haptics.light();
              // TODO: Navigate to notification settings
            }}
            colors={colors}
          />
          <ActionButton
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {
              haptics.light();
              // TODO: Navigate to help
            }}
            colors={colors}
            showDivider={false}
          />
        </Animated.View>

        {/* Sign Out Button */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <TouchableOpacity
            style={[
              styles.signOutButton,
              { backgroundColor: colors.error },
              signingOut && styles.buttonDisabled,
            ]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.text.inverse}
                />
                <Text
                  style={[styles.signOutText, { color: colors.text.inverse }]}
                >
                  Sign Out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.text.tertiary }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIconContainer,
          { backgroundColor: colors.primary + "10" },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.text.tertiary }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: colors.text.primary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  colors,
  showDivider = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
  showDivider?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        showDivider && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.actionIconContainer,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.text.primary} />
      </View>
      <Text style={[styles.actionText, { color: colors.text.primary }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.md,
    padding: Spacing.xs,
    borderRadius: 60,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  name: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: Typography.sizes.md,
    marginBottom: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  ratingCount: {
    fontSize: Typography.sizes.sm,
  },
  modeSwitcherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  modeSwitcherButtonPressed: {
    opacity: 0.8,
  },
  modeSwitcherText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  modeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  modeText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  modeDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  section: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  versionText: {
    fontSize: Typography.sizes.xs,
    textAlign: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
