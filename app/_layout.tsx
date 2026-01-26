// app/_layout.tsx
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
  const {
    currentMode,
    loading: modeLoading,
    initialize: initializeMode,
  } = useModeStore();

  // Initialize both auth and mode on app start
  useEffect(() => {
    initialize();
    initializeMode();
  }, [initialize, initializeMode]);

  useEffect(() => {
    // Wait for both auth AND mode to load
    if (authLoading || modeLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    // Check if user is on password reset screens
    const isOnPasswordResetFlow =
      segments[1] === "verify-reset-otp" ||
      segments[1] === "reset-new-password";

    // Check if on dynamic route
    const firstSegment = String(segments[0] || "");
    const isOnDynamicRoute =
      firstSegment.startsWith("trip") ||
      firstSegment === "request-form" ||
      firstSegment === "request-details" ||
      firstSegment === "incoming-request-details";

    // FIXED: Get default route based on mode
    const getDefaultRoute = () => {
      return currentMode === "sender" ? "/(tabs)/explore" : "/(tabs)/my-trips";
    };

    // Navigation logic
    if (!session && !inAuthGroup) {
      // No session → redirect to login
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup && !isOnPasswordResetFlow) {
      // Authenticated user in auth screens (not resetting password) → redirect to tabs
      router.replace(getDefaultRoute());
    } else if (session && !inTabsGroup && !inAuthGroup && !isOnDynamicRoute) {
      // Authenticated user NOT in tabs/auth/dynamic routes → redirect to default tab
      // This catches any miscellaneous routes including root
      router.replace(getDefaultRoute());
    }
  }, [session, authLoading, modeLoading, segments, currentMode]);

  // Show loading while initializing
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
