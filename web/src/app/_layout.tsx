import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { PaperProvider } from "react-native-paper";
import {
  useFonts,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from "@expo-google-fonts/barlow-condensed";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { queryClient } from "@/lib/queryClient";
import { useSessaoStore } from "@/store/sessaoStore";
import { tema } from "@/theme";

export default function RootLayout() {
  const autenticado = useSessaoStore((state) => state.token !== null);

  const [fontesCarregadas, erroFontes] = useFonts({
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontesCarregadas && !erroFontes) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={tema}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!autenticado}>
            <Stack.Screen name="login" />
          </Stack.Protected>

          <Stack.Protected guard={autenticado}>
            <Stack.Screen name="(painel)" />
          </Stack.Protected>
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
