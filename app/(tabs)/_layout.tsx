import ModeSwitcher from "@/components/shared/ModeSwitcher";
import { useModeStore } from "@/stores/modeStore";
import { Colors } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const { currentMode } = useModeStore();

  // Sender mode tabs
  if (currentMode === "sender") {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.text.tertiary,
          tabBarStyle: {
            backgroundColor: Colors.background.primary,
            borderTopColor: Colors.border.default,
          },
          headerStyle: {
            backgroundColor: Colors.background.primary,
          },
          headerTintColor: Colors.text.primary,
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            ),
            headerRight: () => <ModeSwitcher />,
          }}
        />
        <Tabs.Screen
          name="my-requests"
          options={{
            title: "My Requests",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Hide traveller-only screens */}
        <Tabs.Screen
          name="my-trips"
          options={{
            href: null, // Hide from tabs
          }}
        />
        <Tabs.Screen
          name="create-trip"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  // Traveller mode tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.background.primary,
          borderTopColor: Colors.border.default,
        },
        headerStyle: {
          backgroundColor: Colors.background.primary,
        },
        headerTintColor: Colors.text.primary,
      }}
    >
      <Tabs.Screen
        name="my-trips"
        options={{
          title: "My Trips",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" size={size} color={color} />
          ),
          headerRight: () => <ModeSwitcher />,
        }}
      />
      <Tabs.Screen
        name="create-trip"
        options={{
          title: "Create Trip",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hide sender-only screens */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-requests"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
