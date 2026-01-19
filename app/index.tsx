import { haptics } from "@/lib/utils/haptics";
import { useAuthStore } from "@/stores/authStore";
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
  const { session, user, profile, loading, signOut } = useAuthStore();
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
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Loading auth state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TravelConnect</Text>

      {session ? (
        <View style={styles.authContainer}>
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={32} color="#34C759" />
          </View>

          <Text style={styles.success}>Logged In</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.info}>{user?.email}</Text>
            </View>

            {profile && (
              <>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color="#666" />
                  <Text style={styles.info}>{profile.full_name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="at-outline" size={20} color="#666" />
                  <Text style={styles.info}>@{profile.username}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#666" />
                  <Text style={styles.info}>{profile.phone}</Text>
                </View>

                {profile.roles && profile.roles.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#666"
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
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authContainer}>
          <View style={styles.statusBadge}>
            <Ionicons name="close-circle" size={32} color="#FF3B30" />
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
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#000",
  },
  authContainer: {
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  statusBadge: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  success: {
    fontSize: 24,
    fontWeight: "600",
    color: "#34C759",
    marginBottom: 24,
  },
  notLoggedIn: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    gap: 8,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
