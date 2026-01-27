import { useThemeColors } from "@/styles/theme";
import { Stack } from "expo-router";

export default function ExploreLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="results" />
      <Stack.Screen
        name="trip-preview"
        options={{
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="request-form"
        options={{
          presentation: "card",
        }}
      />
    </Stack>
  );
}
