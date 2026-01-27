import { useThemeColors } from "@/styles/theme";
import { Stack } from "expo-router";

export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Keep custom UI
        contentStyle: { backgroundColor: colors.background.primary },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />

      {/* Registration Flow */}
      <Stack.Screen
        name="register/step-1-account"
        options={{
          gestureEnabled: false, // No back swipe on first step
        }}
      />
      <Stack.Screen
        name="register/step-2-profile"
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="register/step-3-verify"
        options={{
          gestureEnabled: false, // No back swipe during verification
        }}
      />

      {/* Password Reset Flow */}
      <Stack.Screen name="reset-password/index" />
      <Stack.Screen
        name="reset-password/verify"
        options={{
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="reset-password/new-password"
        options={{
          gestureEnabled: false, // No back swipe during password reset
        }}
      />
    </Stack>
  );
}
