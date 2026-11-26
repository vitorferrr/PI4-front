import { useEffect } from "react";
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
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { queryClient } from "@/lib/queryClient";
import { initializeSession, onSessionChange } from "@/lib/session";
import { useNovaVisitaStore } from "@/store/novaVisitaStore";
import { tema } from "@/theme";

export default function RootLayout() {
  const [fontesCarregadas, erroFontes] = useFonts({
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Mesmo papel do main.tsx antigo: ao trocar de sessão, limpa os dados da sessão anterior
  useEffect(() => {
    const pararDeOuvir = onSessionChange(() => {
      void queryClient.cancelQueries();
      queryClient.clear();
      useNovaVisitaStore.getState().limparSelecao();
    });
    const encerrar = initializeSession();
    return () => {
      encerrar();
      pararDeOuvir();
    };
  }, []);

  if (!fontesCarregadas && !erroFontes) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={tema}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
