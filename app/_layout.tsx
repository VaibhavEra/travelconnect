// app/_layout.tsx (REFACTORED with theme)
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/styles";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    // Check if user is on password reset screens
    const isOnPasswordResetFlow =
      segments[1] === "verify-reset-otp" ||
      segments[1] === "reset-new-password";

    if (!session && !inAuthGroup) {
      // No session and not in auth screens → redirect to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Has session and in auth screens

      // CRITICAL: Don't redirect if user is resetting password
      if (isOnPasswordResetFlow) {
        // Let them complete password reset flow
        return;
      }

      // Otherwise redirect to home (they're logged in)
      router.replace("/");
    }
  }, [session, loading]); // Removed segments from deps to prevent loops

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
});
