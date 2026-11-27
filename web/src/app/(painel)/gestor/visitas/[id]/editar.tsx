import { useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Button } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisita } from "@/hooks/use-visita";
import { api } from "@/lib/api";
import {
  formatarData,
  juntarDataHora,
  mascaraData,
  mascaraHora,
  separarDataHora,
} from "@/lib/formatadores";
import {
  CAMPOS_ESTABELECIMENTO,
  nomesFiscalizadores,
  podeAlterarVisita,
  type CampoEstabelecimento,
  type Estabelecimento,
} from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { CartaoSecao } from "@/components/CartaoSecao";
import { MensagemErro } from "@/components/MensagemErro";
import { ResumoVisita } from "@/components/ResumoVisita";
import { cores } from "@/theme";
import type { Visita } from "@/types/visita";

const LARGURA_DUAS_COLUNAS = 1024;

async function atualizarVisita(id: number, dados: Record<string, unknown>) {
  const response = await api.put<Visita>(`/visitas/${id}`, dados);
  return response.data;
}

function estabelecimentoDa(visita: Visita): Estabelecimento {
  return Object.fromEntries(
    CAMPOS_ESTABELECIMENTO.map((campo) => [campo.chave, visita[campo.chave] ?? ""])
  );
}

function FormularioEdicao({ visita }: { visita: Visita }) {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const agendada = separarDataHora(visita.data_agendada);

  const [denunciado, setDenunciado] = useState(visita.denunciado ?? "");
  const [estabelecimento, setEstabelecimento] = useState(() => estabelecimentoDa(visita));
  const [data, setData] = useState(agendada.data);
  const [hora, setHora] = useState(agendada.hora);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const dataAgendada = juntarDataHora(data, hora);
  const erros = {
    denunciado: denunciado.trim() ? null : "Informe os dados do denunciado.",
    data: dataAgendada ? null : "Informe a data (dd/mm/aaaa) e a hora (hh:mm) agendadas.",
  };
  const valido = !erros.denunciado && !erros.data;

  const salvarMutation = useMutation({
    mutationFn: () => {
      const campos = CAMPOS_ESTABELECIMENTO.map((campo) => [
        campo.chave,
        estabelecimento[campo.chave]?.trim() || null,
      ]);
      return atualizarVisita(visita.id, {
        ...Object.fromEntries(campos),
        denunciado: denunciado.trim(),
        data_agendada: dataAgendada?.toISOString(),
      });
    },
    onSuccess: (atualizada) => {
      queryClient.setQueryData(["visita", String(visita.id)], atualizada);
      queryClient.invalidateQueries({ queryKey: ["visitas"] });
      voltar();
    },
  });

  function voltar() {
    router.navigate({ pathname: "/gestor/visitas/[id]", params: { id: visita.id } });
  }

  function salvar() {
    setTentouEnviar(true);
    if (valido && !salvarMutation.isPending) salvarMutation.mutate();
  }

  function mudarCampo(chave: CampoEstabelecimento, valor: string) {
    setEstabelecimento((atual) => ({ ...atual, [chave]: valor }));
  }

  const endereco = [estabelecimento.endereco, estabelecimento.bairro].filter(Boolean).join(", ");

  return (
    <View style={[styles.colunas, width >= LARGURA_DUAS_COLUNAS && styles.colunasLado]}>
      <View style={styles.formulario}>
        {salvarMutation.isError && <MensagemErro erro={salvarMutation.error} />}

        <CartaoSecao numero={1} titulo="Estabelecimento">
          <Campo
            rotulo="Dados do denunciado *"
            value={denunciado}
            onChangeText={setDenunciado}
            placeholder="Nome ou razão social do denunciado"
            erro={tentouEnviar ? erros.denunciado : null}
          />
          <View style={styles.camposGrade}>
            {CAMPOS_ESTABELECIMENTO.map((campo) => (
              <Campo
                key={campo.chave}
                rotulo={campo.rotulo}
                value={estabelecimento[campo.chave] ?? ""}
                onChangeText={(texto) => mudarCampo(campo.chave, texto)}
                placeholder={`ex.: ${campo.exemplo}`}
                style={styles.campoGrade}
              />
            ))}
          </View>
        </CartaoSecao>

        <CartaoSecao numero={2} titulo="Data">
          <View style={styles.dataHora}>
            <Campo
              rotulo="Data agendada *"
              value={data}
              onChangeText={(texto) => setData(mascaraData(texto))}
              placeholder="dd/mm/aaaa"
              style={styles.campoData}
            />
            <Campo
              rotulo="Hora *"
              value={hora}
              onChangeText={(texto) => setHora(mascaraHora(texto))}
              placeholder="hh:mm"
              onSubmitEditing={salvar}
              style={styles.campoHora}
            />
          </View>
          {tentouEnviar && erros.data && <Text style={styles.erro}>{erros.data}</Text>}
        </CartaoSecao>
      </View>

      <ResumoVisita
        local={estabelecimento.nome_fantasia?.trim() || denunciado.trim() || "A definir"}
        endereco={endereco || "A definir"}
        fiscal={nomesFiscalizadores(visita)}
        data={dataAgendada ? formatarData(dataAgendada.toISOString()) : "A definir"}
        aviso="Para trocar o fiscal, use o quadro Equipe na página da visita."
        style={width >= LARGURA_DUAS_COLUNAS && styles.resumoLateral}
      >
        <Button
          mode="contained"
          buttonColor={cores.sucesso}
          onPress={salvar}
          loading={salvarMutation.isPending}
          disabled={salvarMutation.isPending}
          contentStyle={styles.salvar}
        >
          Salvar alterações
        </Button>
        <Button textColor={cores.branco} onPress={voltar}>
          Cancelar
        </Button>
      </ResumoVisita>
    </View>
  );
}

export default function EditarVisitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: visita, isPending, isError, error, refetch, isFetching } = useVisita(id);

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina sobretitulo={`Visita #${id}`} titulo="Editar visita" />

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : podeAlterarVisita(visita) ? (
        <FormularioEdicao visita={visita} />
      ) : (
        <MensagemErro
          erro={new Error("Só dá para editar visitas agendadas que ainda não têm documento.")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  carregando: {
    marginTop: 40,
  },
  colunas: {
    gap: 20,
  },
  colunasLado: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  formulario: {
    flex: 1,
    gap: 16,
  },
  resumoLateral: {
    width: 300,
  },
  camposGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  campoGrade: {
    flexGrow: 1,
    flexBasis: 240,
  },
  erro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.erroForte,
  },
  dataHora: {
    flexDirection: "row",
    gap: 16,
  },
  campoData: {
    width: 180,
  },
  campoHora: {
    width: 120,
  },
  salvar: {
    height: 50,
  },
});
