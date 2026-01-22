// app/index.tsx
import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const { session, user, loading, signOut } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.text}>Loading auth state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShelfScore</Text>

      {session ? (
        <View style={styles.authContainer}>
          <View style={styles.statusBadge}>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={Colors.success}
            />
          </View>

          <Text style={styles.success}>Logged In</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.text.secondary}
              />
              <Text style={styles.info}>{user?.email}</Text>
            </View>

            {profile && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={Colors.text.secondary}
                  />
                  <Text style={styles.info}>{profile.full_name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="at-outline"
                    size={20}
                    color={Colors.text.secondary}
                  />
                  <Text style={styles.info}>@{profile.username}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.text.secondary}
                  />
                  <Text style={styles.info}>{profile.phone}</Text>
                </View>

                {profile.roles && profile.roles.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={Colors.text.secondary}
                    />
                    <Text style={styles.info}>{profile.roles.join(", ")}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator color={Colors.text.inverse} size="small" />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={Colors.text.inverse}
                />
                <Text style={styles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authContainer}>
          <View style={styles.statusBadge}>
            <Ionicons name="close-circle" size={32} color={Colors.error} />
          </View>
          <Text style={styles.notLoggedIn}>Not Logged In</Text>
          <Text style={styles.subtitle}>Auth store is working!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xxl - 8,
    color: Colors.text.primary,
  },
  authContainer: {
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  statusBadge: {
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  success: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
    marginBottom: Spacing.lg,
  },
  notLoggedIn: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    width: "100%",
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
  },
  info: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    flex: 1,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error,
    paddingVertical: Spacing.sm + 6,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
});
