import { Stack } from "expo-router";

import { FeedsProvider } from "@/contexts/FeedsContext";

export default function RootLayout() {
  return (
    <FeedsProvider>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Wifi Pet Feeder",
          }}
        />

        <Stack.Screen
          name="add-feed"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="repeat"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </FeedsProvider>
  );
}
