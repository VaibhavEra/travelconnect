// app/_layout.tsx (UPDATE)
import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { Colors } from "@/styles";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading: authLoading, initialize } = useAuthStore();
  const { initialize: initializeMode, loading: modeLoading } = useModeStore();

  useEffect(() => {
    initialize();
    initializeMode();
  }, [initialize, initializeMode]);

  useEffect(() => {
    if (authLoading || modeLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    // Check if user is on password reset screens
    const isOnPasswordResetFlow =
      segments[1] === "verify-reset-otp" ||
      segments[1] === "reset-new-password";

    // Check if on dynamic route by converting to string
    const firstSegment = String(segments[0] || "");
    const isOnDynamicRoute =
      firstSegment === "trip" || firstSegment.startsWith("trip-");

    if (!session && !inAuthGroup) {
      // No session and not in auth screens → redirect to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      // Has session and in auth screens

      // CRITICAL: Don't redirect if user is resetting password
      if (isOnPasswordResetFlow) {
        return;
      }

      // Redirect to tabs (mode-based)
      router.replace("/(tabs)/my-trips");
    } else if (
      session &&
      !inTabsGroup &&
      !inAuthGroup &&
      !isOnDynamicRoute &&
      segments.length > 0
    ) {
      // Has session but not in tabs/auth/dynamic routes → redirect to tabs
      router.replace("/(tabs)/my-trips");
    }
  }, [session, authLoading, modeLoading, segments]);

  if (authLoading || modeLoading) {
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
