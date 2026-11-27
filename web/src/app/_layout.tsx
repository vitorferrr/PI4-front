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
} from "@expo-google-fonts/inter";
import { encerrarSessao, queryClient } from "@/lib/queryClient";
import { expiracaoDoToken } from "@/lib/sessao";
import { useSessaoStore } from "@/store/sessaoStore";
import { cores, tema } from "@/theme";

const ESTILO_NAVEGADOR = `
::selection { background: ${cores.amarelo}; color: ${cores.azulEscuro}; }
* { scrollbar-width: thin; scrollbar-color: ${cores.borda} transparent; }
:focus-visible { outline: 2px solid ${cores.azul}; outline-offset: 2px; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
`;

if (typeof document !== "undefined" && !document.getElementById("estilo-constata")) {
  const estilo = document.createElement("style");
  estilo.id = "estilo-constata";
  estilo.textContent = ESTILO_NAVEGADOR;
  document.head.appendChild(estilo);
}

export default function RootLayout() {
  const token = useSessaoStore((state) => state.token);
  const temRefreshToken = useSessaoStore((state) => state.refreshToken !== null);
  const autenticado = token !== null;

  // Sem refresh token (back antes da DT-38), a sessão acaba quando o access token vence.
  // Com refresh token, a próxima requisição renova a sessão (lib/api.ts).
  useEffect(() => {
    if (temRefreshToken) return;
    const expiracao = expiracaoDoToken(token);
    if (expiracao === null) return;
    const restante = Math.min(Math.max(expiracao - Date.now(), 0), 2147483647);
    const timer = setTimeout(encerrarSessao, restante);
    return () => clearTimeout(timer);
  }, [token, temRefreshToken]);

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
