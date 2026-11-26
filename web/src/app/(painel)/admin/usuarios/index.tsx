import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Checkbox, Icon, TextInput } from "react-native-paper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  BotaoPrimario,
  Cartao,
  ErroCarga,
  ListaErros,
  Mensagem,
  PageHeader,
  PerfilBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { buscarUsuarios, buscarVisitas } from "@/lib/consultas";
import { mensagensDoErro, statusDoErro } from "@/lib/erros";
import { calcularCargas, iniciais, normalizarPesquisa } from "@/lib/visitas";
import { cores } from "@/theme";
import type { Usuario } from "@/types";

type Filtro = "todos" | "gestor" | "fiscalizador";
type Acao = "aprovar" | "reprovar" | "excluir";

const ROLES_LISTADOS = ["gestor", "fiscalizador"];

const ACOES: Record<
  Acao,
  {
    confirmar: (nome: string) => string;
    executar: (id: number) => Promise<unknown>;
    erro: string;
  }
> = {
  aprovar: {
    confirmar: (nome) => `Aprovar o cadastro de ${nome}? A pessoa passa a conseguir entrar no app.`,
    executar: (id) => api.patch(`/usuarios/${id}/aprovar`),
    erro: "Não foi possível aprovar o usuário.",
  },
  reprovar: {
    confirmar: (nome) =>
      `Bloquear ${nome}? O cadastro não é apagado, mas o login fica bloqueado até nova aprovação.`,
    executar: (id) => api.patch(`/usuarios/${id}/reprovar`),
    erro: "Não foi possível bloquear o usuário.",
  },
  excluir: {
    confirmar: (nome) => `Excluir o usuário ${nome}?`,
    executar: (id) => api.delete(`/usuarios/${id}`),
    erro: "Não foi possível excluir o usuário.",
  },
};

// Largura de cada coluna da tabela (o RN não tem <table>: cada linha é uma View em linha)
const COLUNAS = [
  { titulo: "Nome", flex: 3 },
  { titulo: "Matrícula", flex: 1.2 },
  { titulo: "Perfil", flex: 1.3 },
  { titulo: "Visitas abertas", flex: 1.2 },
  { titulo: "Status", flex: 1.8 },
  { titulo: "Ações", flex: 2, direita: true },
];

function StatusAprovacao({ usuario }: { usuario: Usuario }) {
  const ativo = usuario.aprovado !== false;
  return (
    <View style={styles.status}>
      <View style={[styles.statusPonto, { backgroundColor: ativo ? cores.sucesso : "#D9A400" }]} />
      <Text style={[styles.statusTexto, { color: ativo ? cores.sucesso : cores.aviso }]}>
        {ativo ? "Ativo" : "Aguardando aprovação"}
      </Text>
    </View>
  );
}

function LinkAcao({
  rotulo,
  cor = cores.azul,
  onPress,
  disabled,
}: {
  rotulo: string;
  cor?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
      <Text style={[styles.link, { color: cor }, disabled && styles.linkDesativado]}>{rotulo}</Text>
    </Pressable>
  );
}

export default function AdminUsuariosScreen() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const queryClient = useQueryClient();

  const usuariosQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: ({ signal }) => buscarUsuarios(signal),
  });
  const visitasQuery = useQuery({
    queryKey: ["visitas"],
    queryFn: ({ signal }) => buscarVisitas(signal),
  });

  const acaoMutation = useMutation({
    mutationFn: ({ acao, id }: { acao: Acao; id: number }) => ACOES[acao].executar(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  // no navegador o window.confirm continua funcionando (o Alert do RN não faz nada na web)
  const executar = (acao: Acao, usuario: Usuario) => {
    if (acaoMutation.isPending) return;
    if (window.confirm(ACOES[acao].confirmar(usuario.nome))) {
      acaoMutation.mutate({ acao, id: usuario.id });
    }
  };

  const todos = (usuariosQuery.data ?? []).filter((usuario) =>
    ROLES_LISTADOS.includes(usuario.role)
  );
  const cargas = calcularCargas(visitasQuery.data ?? []);
  const termo = normalizarPesquisa(busca);
  const lista = todos.filter(
    (usuario) =>
      (filtro === "todos" || usuario.role === filtro) &&
      (!soPendentes || usuario.aprovado === false) &&
      (!termo ||
        [usuario.nome, usuario.email, usuario.matricula].some((valor) =>
          normalizarPesquisa(valor).includes(termo)
        ))
  );
  const contar = (role: Filtro) =>
    todos.filter((usuario) => role === "todos" || usuario.role === role).length;
  const pendentes = todos.filter((usuario) => usuario.aprovado === false).length;
  const segmentos: { key: Filtro; label: string }[] = [
    { key: "todos", label: `Todos · ${contar("todos")}` },
    { key: "gestor", label: `Gestores · ${contar("gestor")}` },
    { key: "fiscalizador", label: `Fiscalizadores · ${contar("fiscalizador")}` },
  ];
  const erroAcao = acaoMutation.isError
    ? mensagensDoErro(acaoMutation.error, ACOES[acaoMutation.variables!.acao].erro)
    : [];

  return (
    <View>
      <PageHeader
        eyebrow="Gestão de usuários"
        title="Gestores e fiscalizadores"
        actions={
          <BotaoPrimario icon="plus" onPress={() => router.push("/admin/usuarios/novo")}>
            Novo usuário
          </BotaoPrimario>
        }
      />

      {pendentes > 0 ? (
        <Pressable
          onPress={() => setSoPendentes(true)}
          style={styles.pendentes}
          accessibilityRole="button"
        >
          <Icon source="account-clock-outline" size={22} color={cores.aviso} />
          <Text style={styles.pendentesTexto}>
            {pendentes} {pendentes === 1 ? "cadastro aguardando" : "cadastros aguardando"}{" "}
            aprovação.
          </Text>
          <Text style={styles.pendentesLink}>Ver pendentes</Text>
        </Pressable>
      ) : null}

      <View style={styles.filtros}>
        <TextInput
          mode="outlined"
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome, matrícula ou e-mail"
          accessibilityLabel="Buscar usuários"
          left={<TextInput.Icon icon="magnify" color={cores.textoSecundario} />}
          outlineColor={cores.bordaCampo}
          outlineStyle={styles.buscaBorda}
          style={styles.busca}
          placeholderTextColor="#757575"
        />

        <View
          style={styles.segmentos}
          accessibilityRole="radiogroup"
          aria-label="Filtrar por perfil"
        >
          {segmentos.map((segmento) => {
            const ativo = filtro === segmento.key;
            return (
              <Pressable
                key={segmento.key}
                onPress={() => setFiltro(segmento.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                style={[styles.segmento, ativo && styles.segmentoAtivo]}
              >
                <Text style={[styles.segmentoTexto, ativo && styles.segmentoTextoAtivo]}>
                  {segmento.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setSoPendentes((atual) => !atual)}
          style={styles.checagem}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: soPendentes }}
        >
          <Checkbox.Android
            status={soPendentes ? "checked" : "unchecked"}
            color={cores.azul}
            onPress={() => setSoPendentes((atual) => !atual)}
          />
          <Text style={styles.checagemTexto}>Só aguardando aprovação</Text>
        </Pressable>
      </View>

      {erroAcao.length > 0 ? (
        <View style={styles.erroAcao}>
          <ListaErros mensagens={erroAcao} />
        </View>
      ) : null}

      <Cartao style={styles.tabelaCartao}>
        {usuariosQuery.isPending ? (
          <Mensagem>Carregando usuários...</Mensagem>
        ) : usuariosQuery.isError ? (
          <View style={styles.erroCarga}>
            <ErroCarga
              mensagem={
                statusDoErro(usuariosQuery.error) === 403
                  ? "Você não tem permissão para consultar os usuários."
                  : "Erro ao carregar usuários."
              }
              onTentar={() => usuariosQuery.refetch()}
              tentando={usuariosQuery.isFetching}
            />
          </View>
        ) : todos.length === 0 ? (
          <Mensagem>Nenhum gestor ou fiscalizador cadastrado.</Mensagem>
        ) : (
          // em tela estreita a tabela rola para o lado, como o overflow-x-auto antigo
          <ScrollView horizontal contentContainerStyle={styles.tabelaRolagem}>
            <View style={styles.tabela}>
              <View style={[styles.linha, styles.linhaCabecalho]}>
                {COLUNAS.map((coluna) => (
                  <Text
                    key={coluna.titulo}
                    style={[
                      styles.celula,
                      styles.cabecalhoTexto,
                      { flex: coluna.flex },
                      coluna.direita && styles.direita,
                    ]}
                  >
                    {coluna.titulo}
                  </Text>
                ))}
              </View>

              {lista.map((usuario) => (
                <View key={usuario.id} style={[styles.linha, styles.linhaDados]}>
                  <View style={[styles.celula, styles.nomeCelula, { flex: COLUNAS[0].flex }]}>
                    <Avatar iniciais={iniciais(usuario.nome)} />
                    <View style={styles.nomeTextos}>
                      <Text style={styles.nome}>{usuario.nome}</Text>
                      <Text style={styles.email}>{usuario.email}</Text>
                    </View>
                  </View>
                  <Text style={[styles.celula, styles.texto, { flex: COLUNAS[1].flex }]}>
                    {usuario.matricula?.trim() || "—"}
                  </Text>
                  <View style={[styles.celula, { flex: COLUNAS[2].flex }]}>
                    <PerfilBadge role={usuario.role} />
                  </View>
                  <Text style={[styles.celula, styles.texto, { flex: COLUNAS[3].flex }]}>
                    {usuario.role === "fiscalizador" && visitasQuery.data
                      ? (cargas.get(usuario.id)?.abertas ?? 0)
                      : "—"}
                  </Text>
                  <View style={[styles.celula, { flex: COLUNAS[4].flex }]}>
                    <StatusAprovacao usuario={usuario} />
                  </View>
                  <View style={[styles.celula, styles.acoes, { flex: COLUNAS[5].flex }]}>
                    {usuario.aprovado === false ? (
                      <LinkAcao
                        rotulo="Aprovar"
                        cor={cores.sucesso}
                        disabled={acaoMutation.isPending}
                        onPress={() => executar("aprovar", usuario)}
                      />
                    ) : usuario.role === "fiscalizador" ? (
                      <LinkAcao
                        rotulo="Bloquear"
                        cor={cores.aviso}
                        disabled={acaoMutation.isPending}
                        onPress={() => executar("reprovar", usuario)}
                      />
                    ) : null}
                    <LinkAcao
                      rotulo="Editar"
                      onPress={() =>
                        router.push({
                          pathname: "/admin/usuarios/[id]/editar",
                          params: { id: String(usuario.id) },
                        })
                      }
                    />
                    <LinkAcao
                      rotulo="Excluir"
                      cor={cores.erroForte}
                      disabled={acaoMutation.isPending}
                      onPress={() => executar("excluir", usuario)}
                    />
                  </View>
                </View>
              ))}

              {lista.length === 0 ? <Mensagem>Nenhum usuário encontrado.</Mensagem> : null}
            </View>
          </ScrollView>
        )}
      </Cartao>

      {todos.length > 0 ? (
        <Text style={styles.rodape} accessibilityRole="text">
          Mostrando {lista.length} de {todos.length} usuários.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pendentes: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: cores.avisoFundo,
  },
  pendentesTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.avisoTexto,
  },
  pendentesLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.avisoTexto,
    textDecorationLine: "underline",
  },
  filtros: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  busca: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 280,
    height: 48,
    backgroundColor: cores.branco,
    fontSize: 15,
  },
  buscaBorda: {
    borderRadius: 12,
  },
  segmentos: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#E3EBF4",
  },
  segmento: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  segmentoAtivo: {
    backgroundColor: cores.branco,
    boxShadow: "0 1px 2px rgba(15, 30, 51, 0.08)",
  },
  segmentoTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoMedio,
  },
  segmentoTextoAtivo: {
    fontFamily: "Inter_700Bold",
    color: cores.azulEscuro,
  },
  checagem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checagemTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  erroAcao: {
    marginTop: 16,
  },
  tabelaCartao: {
    marginTop: 24,
    overflow: "hidden",
  },
  erroCarga: {
    padding: 20,
  },
  tabelaRolagem: {
    flexGrow: 1,
  },
  tabela: {
    flex: 1,
    minWidth: 960,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
  },
  linhaCabecalho: {
    backgroundColor: cores.fundoTabela,
  },
  linhaDados: {
    borderTopWidth: 1,
    borderTopColor: cores.linhaTabela,
  },
  celula: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cabecalhoTexto: {
    paddingVertical: 14,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  direita: {
    textAlign: "right",
  },
  texto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.texto,
  },
  nomeCelula: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nomeTextos: {
    flex: 1,
    minWidth: 0,
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
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  acoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 12,
  },
  link: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  linkDesativado: {
    opacity: 0.5,
  },
  rodape: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
});
