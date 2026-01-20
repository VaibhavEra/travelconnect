import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          title: "Verify OTP",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Forgot Password",
          headerShown: false,
        }}
      />
      {/* ADD THESE TWO NEW SCREENS */}
      <Stack.Screen
        name="verify-reset-otp"
        options={{
          title: "Verify Reset Code",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="reset-new-password"
        options={{
          title: "New Password",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
