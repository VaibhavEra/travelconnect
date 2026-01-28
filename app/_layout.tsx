import {
  Slot,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { useThemeColors } from "@/styles/theme";

export default function RootLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const { session, loading: authLoading, initialize } = useAuthStore();
  const {
    currentMode,
    loading: modeLoading,
    initialize: initializeMode,
  } = useModeStore();

  /**
   * Initialize auth + mode exactly once
   */
  useEffect(() => {
    initialize();
    initializeMode();
  }, [initialize, initializeMode]);

  /**
   * Navigation guard (iOS-safe)
   */
  useEffect(() => {
    // Wait until router is mounted (CRITICAL for iOS)
    if (!navState?.key) return;
    if (authLoading || modeLoading) return;

    const root = segments[0];
    const second = segments[1];

    const inAuthGroup = root === "(auth)";
    const inTabsGroup = root === "(tabs)";

    const isPasswordResetFlow =
      root === "(auth)" && second === "reset-password";

    const isDynamicRoute = segments.some(
      (segment) => typeof segment === "string" && segment.startsWith("["),
    );

    const defaultRoute =
      currentMode === "sender" ? "/(tabs)/explore" : "/(tabs)/create-trip";

    // Not logged in → force auth
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    // Logged in but still in auth (except reset flow)
    if (session && inAuthGroup && !isPasswordResetFlow) {
      router.replace(defaultRoute);
      return;
    }

    // Logged in but outside tabs/auth (deep links, bad state)
    if (session && !inTabsGroup && !inAuthGroup && !isDynamicRoute) {
      router.replace(defaultRoute);
      return;
    }
  }, [navState, segments, session, authLoading, modeLoading, currentMode]);

  /**
   * Global loading screen
   */
  if (authLoading || modeLoading || !navState?.key) {
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
