import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ehSessaoExpirada } from "@/lib/queryClient";
import { MensagemErro } from "@/components/MensagemErro";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

async function concluirVisita(id: number) {
  const response = await api.patch<Visita>(`/visitas/${id}/concluir`);
  return response.data;
}

export function ConclusaoVisita({ visita }: { visita: Visita }) {
  const queryClient = useQueryClient();
  const concluirMutation = useMutation({
    mutationFn: () => concluirVisita(visita.id),
    onSuccess: (atualizada) => {
      queryClient.setQueryData(["visita", String(visita.id)], atualizada);
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
    },
    onError: (erro) => {
      if (!ehSessaoExpirada(erro)) {
        queryClient.invalidateQueries({ queryKey: ["visita", String(visita.id)] });
      }
    },
  });

  function concluir() {
    if (window.confirm(`Deseja concluir a visita #${visita.id}?`)) concluirMutation.mutate();
  }

  if (visita.status !== "em_andamento" && !concluirMutation.isSuccess) return null;

  return (
    <View style={styles.conclusao}>
      <Text style={styles.titulo}>Conclusão da visita</Text>
      <Text style={styles.texto}>
        A visita só é concluída depois que o documento final é gerado com todas as assinaturas.
      </Text>
      {concluirMutation.isError && <MensagemErro erro={concluirMutation.error} />}
      {concluirMutation.isSuccess ? (
        <Text style={styles.sucesso}>Visita concluída com sucesso.</Text>
      ) : (
        <Button
          mode="contained"
          buttonColor={cores.sucesso}
          onPress={concluir}
          loading={concluirMutation.isPending}
          disabled={concluirMutation.isPending}
          contentStyle={styles.botao}
        >
          Concluir visita
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conclusao: {
    gap: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: cores.azul,
    backgroundColor: cores.branco,
  },
  titulo: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  sucesso: {
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.sucesso,
    backgroundColor: cores.sucessoFundo,
  },
  botao: {
    height: 50,
  },
});
