import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Checkbox,
  DataTable,
  SegmentedButtons,
} from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsuarios } from "@/hooks/use-usuarios";
import { useVisitas } from "@/hooks/use-visitas";
import { api } from "@/lib/api";
import { iniciais, normalizarPesquisa, plural } from "@/lib/formatadores";
import { calcularCargas } from "@/lib/visitas";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { Mensagem } from "@/components/Mensagem";
import { MensagemErro } from "@/components/MensagemErro";
import { SeloPerfil } from "@/components/SeloPerfil";
import { cores } from "@/theme";
import type { Usuario } from "@/types/usuario";

type Filtro = "todos" | "gestor" | "fiscalizador";
type Acao = "aprovar" | "reprovar" | "excluir";

const PERGUNTAS: Record<Acao, (nome: string) => string> = {
  aprovar: (nome) => `Aprovar o cadastro de ${nome}? A pessoa passa a conseguir entrar no app.`,
  reprovar: (nome) => `Bloquear ${nome}? O login fica bloqueado até nova aprovação.`,
  excluir: (nome) => `Excluir o usuário ${nome}?`,
};

function executarAcao({ acao, id }: { acao: Acao; id: number }) {
  if (acao === "excluir") return api.delete(`/usuarios/${id}`);
  return api.patch(`/usuarios/${id}/${acao}`);
}

function combinaComBusca(usuario: Usuario, termo: string) {
  return [usuario.nome, usuario.email, usuario.matricula].some((valor) =>
    normalizarPesquisa(valor).includes(termo)
  );
}

export default function UsuariosScreen() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch, isFetching } = useUsuarios();
  const { data: visitas } = useVisitas();

  const acaoMutation = useMutation({
    mutationFn: executarAcao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  function confirmar(acao: Acao, usuario: Usuario) {
    if (window.confirm(PERGUNTAS[acao](usuario.nome))) {
      acaoMutation.mutate({ acao, id: usuario.id });
    }
  }

  const equipe = (data ?? []).filter((usuario) => usuario.role !== "admin");
  const pendentes = equipe.filter((usuario) => usuario.aprovado === false);
  const cargas = calcularCargas(visitas ?? []);
  const termo = normalizarPesquisa(busca);
  const lista = equipe.filter(
    (usuario) =>
      (filtro === "todos" || usuario.role === filtro) &&
      (!soPendentes || usuario.aprovado === false) &&
      combinaComBusca(usuario, termo)
  );
  const contar = (role: Filtro) => equipe.filter((usuario) => usuario.role === role).length;

  return (
    <View style={styles.pagina}>
      <CabecalhoPagina
        sobretitulo="Gestão de usuários"
        titulo="Gestores e fiscalizadores"
        acoes={
          <Button mode="contained" icon="plus" onPress={() => router.push("/admin/usuarios/novo")}>
            Novo usuário
          </Button>
        }
      />

      {pendentes.length > 0 && (
        <View style={styles.pendentes}>
          <Text style={styles.pendentesTexto}>
            {plural(pendentes.length, "cadastro aguardando", "cadastros aguardando")} aprovação.
          </Text>
          <Button mode="text" textColor={cores.avisoTexto} onPress={() => setSoPendentes(true)}>
            Ver pendentes
          </Button>
        </View>
      )}

      <View style={styles.filtros}>
        <Campo
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome, matrícula ou e-mail"
          icone="magnify"
          style={styles.busca}
        />
        <SegmentedButtons
          style={styles.segmentos}
          value={filtro}
          onValueChange={(valor) => setFiltro(valor as Filtro)}
          buttons={[
            { value: "todos", label: `Todos · ${equipe.length}` },
            { value: "gestor", label: `Gestores · ${contar("gestor")}` },
            { value: "fiscalizador", label: `Fiscalizadores · ${contar("fiscalizador")}` },
          ]}
        />
        <Checkbox.Item
          label="Só aguardando aprovação"
          status={soPendentes ? "checked" : "unchecked"}
          onPress={() => setSoPendentes(!soPendentes)}
          mode="android"
          position="leading"
          labelStyle={styles.checagemTexto}
        />
      </View>

      {acaoMutation.isError && <MensagemErro erro={acaoMutation.error} />}

      {isPending ? (
        <ActivityIndicator size="large" style={styles.carregando} />
      ) : isError ? (
        <MensagemErro erro={error} onTentar={() => refetch()} tentando={isFetching} />
      ) : (
        <ScrollView horizontal contentContainerStyle={styles.rolagem}>
          <DataTable style={styles.tabela}>
            <DataTable.Header style={styles.cabecalhoTabela}>
              <DataTable.Title style={styles.colunaNome}>Nome</DataTable.Title>
              <DataTable.Title>Matrícula</DataTable.Title>
              <DataTable.Title>Perfil</DataTable.Title>
              <DataTable.Title>Visitas abertas</DataTable.Title>
              <DataTable.Title style={styles.colunaStatus}>Status</DataTable.Title>
              <DataTable.Title style={styles.colunaAcoes} numeric>
                Ações
              </DataTable.Title>
            </DataTable.Header>

            {lista.map((usuario) => {
              const ativo = usuario.aprovado !== false;
              return (
                <DataTable.Row key={usuario.id} style={styles.linha}>
                  <DataTable.Cell style={styles.colunaNome}>
                    <View style={styles.pessoa}>
                      <Avatar.Text
                        size={36}
                        label={iniciais(usuario.nome)}
                        style={styles.avatar}
                        labelStyle={styles.avatarTexto}
                        color={cores.atribuida}
                      />
                      <View>
                        <Text style={styles.nome}>{usuario.nome}</Text>
                        <Text style={styles.email}>{usuario.email}</Text>
                      </View>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell>{usuario.matricula?.trim() || "—"}</DataTable.Cell>
                  <DataTable.Cell>
                    <SeloPerfil role={usuario.role} />
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {usuario.role === "fiscalizador" ? (cargas.get(usuario.id)?.abertas ?? 0) : "—"}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colunaStatus}>
                    <Text style={ativo ? styles.ativo : styles.aguardando}>
                      {ativo ? "● Ativo" : "● Aguardando aprovação"}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colunaAcoes} numeric>
                    <View style={styles.acoes}>
                      {!ativo && (
                        <Button
                          compact
                          textColor={cores.sucesso}
                          onPress={() => confirmar("aprovar", usuario)}
                        >
                          Aprovar
                        </Button>
                      )}
                      {ativo && usuario.role === "fiscalizador" && (
                        <Button
                          compact
                          textColor={cores.aviso}
                          onPress={() => confirmar("reprovar", usuario)}
                        >
                          Bloquear
                        </Button>
                      )}
                      <Button
                        compact
                        onPress={() =>
                          router.push({
                            pathname: "/admin/usuarios/[id]/editar",
                            params: { id: usuario.id },
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        compact
                        textColor={cores.erroForte}
                        onPress={() => confirmar("excluir", usuario)}
                      >
                        Excluir
                      </Button>
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}

            {lista.length === 0 && <Mensagem>Nenhum usuário encontrado.</Mensagem>}
          </DataTable>
        </ScrollView>
      )}

      {equipe.length > 0 && (
        <Text style={styles.rodape}>
          Mostrando {lista.length} de {equipe.length} usuários.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  pendentes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 18,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: cores.avisoFundo,
  },
  pendentesTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.avisoTexto,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  busca: {
    flexGrow: 1,
    flexBasis: 280,
  },
  segmentos: {
    minWidth: 520,
  },
  checagemTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  carregando: {
    marginTop: 40,
  },
  rolagem: {
    flexGrow: 1,
  },
  tabela: {
    minWidth: 980,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    overflow: "hidden",
    backgroundColor: cores.branco,
  },
  cabecalhoTabela: {
    backgroundColor: cores.fundoTabela,
  },
  linha: {
    minHeight: 64,
    borderBottomColor: cores.linhaTabela,
  },
  colunaNome: {
    flex: 2.6,
  },
  colunaStatus: {
    flex: 1.6,
  },
  colunaAcoes: {
    flex: 2.2,
  },
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
  nome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  ativo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.sucesso,
  },
  aguardando: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.aviso,
  },
  acoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  rodape: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
