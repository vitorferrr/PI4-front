import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Avatar, Button } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFiscalizadores } from "@/hooks/use-usuarios";
import { api } from "@/lib/api";
import { iniciais } from "@/lib/formatadores";
import { CartaoSecao } from "@/components/CartaoSecao";
import { MensagemErro } from "@/components/MensagemErro";
import { Selecao } from "@/components/Selecao";
import { cores } from "@/theme";
import type { UsuarioResumo } from "@/types/usuario";
import type { Visita } from "@/types/visita";

type AcaoEquipe =
  | { tipo: "colocar"; fiscalId: number }
  | { tipo: "trocar"; fiscalId: number }
  | { tipo: "tirar"; fiscalId: number };

function executarAcao(visitaId: number, acao: AcaoEquipe) {
  const rota = `/visitas/${visitaId}/fiscalizadores`;
  if (acao.tipo === "colocar") return api.post(rota, { fiscalizadorId: acao.fiscalId });
  if (acao.tipo === "trocar") return api.put(rota, { fiscalizadoresIds: [acao.fiscalId] });
  return api.delete(`${rota}/${acao.fiscalId}`);
}

function Pessoa({
  papel,
  pessoa,
  onTirar,
}: {
  papel: string;
  pessoa?: UsuarioResumo | null;
  onTirar?: () => void;
}) {
  return (
    <View style={styles.pessoa}>
      <Avatar.Text
        size={36}
        label={iniciais(pessoa?.nome)}
        style={styles.avatar}
        labelStyle={styles.avatarTexto}
        color={cores.atribuida}
      />
      <View style={styles.textos}>
        <Text style={styles.papel}>{papel}</Text>
        <Text style={styles.nome} numberOfLines={1}>
          {pessoa?.nome ?? "Não informado"}
        </Text>
        {pessoa?.email && (
          <Text style={styles.papel} numberOfLines={1}>
            {pessoa.email}
          </Text>
        )}
      </View>
      {onTirar && (
        <Button compact textColor={cores.erroForte} onPress={onTirar}>
          Tirar
        </Button>
      )}
    </View>
  );
}

export function EquipeVisita({ visita, editavel = false }: { visita: Visita; editavel?: boolean }) {
  const queryClient = useQueryClient();
  const fiscalizadores = visita.fiscalizadores ?? [];
  const atual = fiscalizadores[0];
  const { fiscalizadores: opcoes } = useFiscalizadores(editavel);
  const [escolhido, setEscolhido] = useState("");

  const acaoMutation = useMutation({
    mutationFn: (acao: AcaoEquipe) => executarAcao(visita.id, acao),
    onSuccess: () => {
      setEscolhido("");
      queryClient.invalidateQueries({ queryKey: ["visita", String(visita.id)] });
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
    },
  });

  const outros = opcoes.filter((opcao) => opcao.id !== atual?.id);
  const selecionado = outros.find((opcao) => String(opcao.id) === escolhido);

  function tirar(fiscal: UsuarioResumo) {
    if (
      window.confirm(
        `Tirar ${fiscal.nome} desta visita? Ela fica sem fiscal até você colocar outro.`
      )
    ) {
      acaoMutation.mutate({ tipo: "tirar", fiscalId: fiscal.id });
    }
  }

  function confirmarEscolha() {
    if (!selecionado) return;
    acaoMutation.mutate({ tipo: atual ? "trocar" : "colocar", fiscalId: selecionado.id });
  }

  return (
    <CartaoSecao titulo="Equipe">
      <Pessoa papel="Gestor responsável" pessoa={visita.gestor} />
      {fiscalizadores.map((fiscal) => (
        <Pessoa
          key={fiscal.id}
          papel="Agente fiscalizador"
          pessoa={fiscal}
          onTirar={editavel ? () => tirar(fiscal) : undefined}
        />
      ))}
      {fiscalizadores.length === 0 && <Pessoa papel="Agente fiscalizador" />}

      {editavel && outros.length > 0 && (
        <View style={styles.troca}>
          <Selecao
            rotulo={atual ? "Trocar o fiscal por" : "Colocar fiscal"}
            valor={escolhido}
            opcoes={[
              { valor: "", rotulo: "Escolha um fiscal" },
              ...outros.map((opcao) => ({ valor: String(opcao.id), rotulo: opcao.nome })),
            ]}
            onChange={setEscolhido}
          />
          <Button
            mode="contained"
            onPress={confirmarEscolha}
            disabled={!selecionado || acaoMutation.isPending}
            loading={acaoMutation.isPending}
          >
            {atual ? "Trocar fiscal" : "Colocar fiscal"}
          </Button>
        </View>
      )}

      {acaoMutation.isError && <MensagemErro erro={acaoMutation.error} />}
    </CartaoSecao>
  );
}

const styles = StyleSheet.create({
  pessoa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    backgroundColor: cores.atribuidaFundo,
  },
  avatarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  textos: {
    flex: 1,
  },
  papel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  nome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  troca: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
});
