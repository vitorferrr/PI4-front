import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSessaoStore } from "@/store/sessaoStore";

export default function RootLayout() {
  const autenticado = useSessaoStore((state) => state.token !== null);
  const carregada = useSessaoStore((state) => state.carregada);
  const carregar = useSessaoStore((state) => state.carregar);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!carregada) return null;

  // toda tela nova precisa ser listada aqui, pq as rotas fora do Stack.Protected ficam liberadas
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="login" />
        </Stack.Protected>

        <Stack.Protected guard={autenticado}>
          <Stack.Screen name="index" />
          <Stack.Screen name="visita/[id]/index" />
          <Stack.Screen name="visita/[id]/questionario" />
          <Stack.Screen name="visita/[id]/documento" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
