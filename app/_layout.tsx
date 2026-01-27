import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { useThemeColors } from "@/styles/theme";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function RootLayout() {
  const colors = useThemeColors();
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
      segments[0] === "(auth)" &&
      segments[1] === "reset-password" &&
      (segments[2] === "verify" || segments[2] === "new-password");

    // Check if on dynamic route
    const firstSegment = segments[0];
    const isOnDynamicRoute = firstSegment === "incoming-request-details";

    // Get default route based on mode
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
      router.replace(getDefaultRoute());
    }
  }, [session, authLoading, modeLoading, segments, currentMode]);

  // Show loading while initializing
  if (authLoading || modeLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
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
  },
});
