import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";

/**
 * Root index route
 * iOS requires an explicit "/" entry point.
 */
export default function Index() {
  const { session } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}
