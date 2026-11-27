import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts, BarlowCondensed_800ExtraBold } from "@expo-google-fonts/barlow-condensed";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { PaperProvider } from "react-native-paper";
import { queryClient } from "@/lib/queryClient";
import { useSessaoStore } from "@/store/sessaoStore";
import { tema } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const autenticado = useSessaoStore((state) => state.token !== null);
  const carregada = useSessaoStore((state) => state.carregada);
  const carregar = useSessaoStore((state) => state.carregar);

  const [fontesCarregadas, erroFontes] = useFonts({
    BarlowCondensed_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const fontesProntas = fontesCarregadas || erroFontes !== null;
  const pronto = carregada && fontesProntas;

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={tema}>
        <Stack screenOptions={{ animation: "slide_from_right" }}>
          <Stack.Protected guard={!autenticado}>
            <Stack.Screen name="login" />
          </Stack.Protected>

          <Stack.Protected guard={autenticado}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="visita/[id]/index" />
            <Stack.Screen name="visita/[id]/questionario" />
            <Stack.Screen name="visita/[id]/documento" />
          </Stack.Protected>
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
