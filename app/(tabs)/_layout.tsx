import { useModeStore } from "@/stores/modeStore";
import { useThemeColors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useMemo } from "react";

export default function TabsLayout() {
  const colors = useThemeColors();
  const currentMode = useModeStore((state) => state.currentMode);

  const isSender = currentMode === "sender";

  // Shared screen options for both modes
  const commonScreenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.text.tertiary,
      tabBarStyle: {
        backgroundColor: colors.background.primary,
        borderTopColor: colors.border.default,
        borderTopWidth: 1,
      },
      headerShown: false,
    }),
    [colors],
  );

  return (
    <Tabs screenOptions={commonScreenOptions}>
      {/* Sender tabs */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          href: isSender ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          href: isSender ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Traveller tabs */}
      <Tabs.Screen
        name="create-trip"
        options={{
          title: "Create Trip",
          href: isSender ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: "My Trips",
          href: isSender ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          href: isSender ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Shared tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: undefined, // always visible
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
