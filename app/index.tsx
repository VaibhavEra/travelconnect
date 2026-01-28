import { useAuthStore } from "@/stores/authStore";
import { useModeStore } from "@/stores/modeStore";
import { Redirect } from "expo-router";

/**
 * Root index route
 * iOS requires an explicit "/" entry point.
 */
export default function Index() {
  const { session } = useAuthStore();
  const { currentMode } = useModeStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Redirect
      href={
        currentMode === "sender" ? "/(tabs)/explore" : "/(tabs)/create-trip"
      }
    />
  );
}
