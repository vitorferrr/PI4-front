import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Icon, RadioButton } from "react-native-paper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BotaoContorno,
  BotaoPrimario,
  Campo,
  Cartao,
  ErroCarga,
  ListaErros,
  Mensagem,
  PageHeader,
  TituloCartao,
} from "@/components/ui";
import { api } from "@/lib/api";
import { mensagensDoErro, statusDoErro } from "@/lib/erros";
import { cores } from "@/theme";
import type { Usuario } from "@/types";

type Perfil = "fiscalizador" | "gestor";

const PERFIS: { value: Perfil; titulo: string; descricao: string }[] = [
  {
    value: "fiscalizador",
    titulo: "Fiscalizador",
    descricao: "Usa o app no celular. Recebe e executa visitas em campo.",
  },
  {
    value: "gestor",
    titulo: "Gestor",
    descricao: "Usa o painel web. Cria e acompanha as visitas da equipe.",
  },
];

const SENHA_MINIMA = 6;

async function criarUsuario(dados: Record<string, unknown>) {
  const response = await api.post<Usuario>("/usuarios", dados);
  return response.data;
}

async function buscarUsuario(id: string, signal?: AbortSignal) {
  const response = await api.get<Usuario>(`/usuarios/${id}`, { signal });
  return response.data;
}

async function atualizarUsuario(id: string, dados: Record<string, unknown>) {
  const response = await api.put<Usuario>(`/usuarios/${id}`, dados);
  return response.data;
}

function voltarParaLista() {
  router.navigate("/admin/usuarios");
}

// Usado pelas duas rotas: sem id é cadastro (novo.tsx), com id é edição ([id]/editar.tsx)
export function FormularioUsuario({ id }: { id?: string }) {
  const usuarioQuery = useQuery({
    queryKey: ["usuario", id],
    queryFn: ({ signal }) => buscarUsuario(id!, signal),
    enabled: !!id,
  });

  if (id && usuarioQuery.isPending) {
    return <Mensagem>Carregando usuário...</Mensagem>;
  }

  if (id && usuarioQuery.isError) {
    return (
      <View style={styles.pagina}>
        <ErroCarga
          mensagem={
            statusDoErro(usuarioQuery.error) === 404
              ? "Usuário não encontrado."
              : "Erro ao carregar usuário."
          }
          onTentar={() => usuarioQuery.refetch()}
          tentando={usuarioQuery.isFetching}
        />
      </View>
    );
  }

  return <Formulario key={id ?? "novo"} id={id} usuario={usuarioQuery.data} />;
}

function Formulario({ id, usuario }: { id?: string; usuario?: Usuario }) {
  const queryClient = useQueryClient();
  const isEdicao = !!id;
  const [perfil, setPerfil] = useState<Perfil>(
    usuario?.role === "gestor" ? "gestor" : "fiscalizador"
  );
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [matricula, setMatricula] = useState(usuario?.matricula ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [senha, setSenha] = useState("");

  const senhaCurta = senha.length > 0 && senha.trim().length < SENHA_MINIMA;

  const salvarMutation = useMutation({
    mutationFn: () => {
      const dados: Record<string, unknown> = {
        nome: nome.trim(),
        email: email.trim(),
        role: perfil,
      };
      if (!isEdicao) {
        return criarUsuario({
          ...dados,
          senha,
          ...(matricula.trim() && { matricula: matricula.trim() }),
        });
      }
      dados.matricula = matricula.trim() || null;
      if (senha) {
        dados.senha = senha;
      }
      return atualizarUsuario(id!, dados);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      if (isEdicao) {
        void queryClient.invalidateQueries({ queryKey: ["usuario", id] });
      }
      voltarParaLista();
    },
  });

  // substitui o onSubmit do <form>: no RN não existe formulário, o botão chama esta função
  function salvar() {
    if (senhaCurta || salvarMutation.isPending) return;
    salvarMutation.mutate();
  }

  return (
    <View style={styles.pagina}>
      <Pressable onPress={voltarParaLista} accessibilityRole="link" style={styles.voltar}>
        <Icon source="chevron-left" size={18} color={cores.azul} />
        <Text style={styles.voltarTexto}>Usuários</Text>
      </Pressable>

      <PageHeader title={isEdicao ? "Editar usuário" : "Novo usuário"}>
        <Text style={styles.descricao}>
          {isEdicao
            ? "Altere os dados do servidor. Deixe a senha em branco para manter a atual."
            : "Informe uma senha inicial e repasse ao servidor; ele entra com o e-mail e essa senha."}
        </Text>
      </PageHeader>

      <View style={styles.conteudo}>
        {salvarMutation.isError ? (
          <ListaErros
            mensagens={mensagensDoErro(
              salvarMutation.error,
              "Não foi possível salvar o usuário. Tente novamente."
            )}
          />
        ) : null}

        <View style={styles.cartoes}>
          <Cartao style={[styles.cartao, styles.cartaoPerfil]}>
            <TituloCartao>Perfil de acesso</TituloCartao>
            <View style={styles.perfis} accessibilityRole="radiogroup" aria-label="Perfil">
              {PERFIS.map((opcao) => {
                const ativo = perfil === opcao.value;
                return (
                  <Pressable
                    key={opcao.value}
                    onPress={() => setPerfil(opcao.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativo }}
                    style={[styles.perfil, ativo && styles.perfilAtivo]}
                  >
                    <RadioButton.Android
                      value={opcao.value}
                      status={ativo ? "checked" : "unchecked"}
                      color={cores.azul}
                      onPress={() => setPerfil(opcao.value)}
                    />
                    <View style={styles.perfilTextos}>
                      <Text style={styles.perfilTitulo}>{opcao.titulo}</Text>
                      <Text style={styles.perfilDescricao}>{opcao.descricao}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Cartao>

          <Cartao style={[styles.cartao, styles.cartaoDados]}>
            <TituloCartao>Dados do servidor</TituloCartao>
            <View style={styles.campos}>
              <Campo
                rotulo="Nome completo"
                value={nome}
                onChangeText={setNome}
                placeholder="Nome completo"
              />

              <View style={styles.duasColunas}>
                <View style={styles.coluna}>
                  <Campo
                    rotulo="Matrícula (sai no documento da visita)"
                    value={matricula}
                    onChangeText={setMatricula}
                    placeholder="ex.: 104512"
                  />
                </View>
                <View style={styles.coluna}>
                  <Campo
                    rotulo="E-mail"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View>
                <Campo
                  rotulo={isEdicao ? "Senha (opcional)" : "Senha"}
                  value={senha}
                  onChangeText={setSenha}
                  placeholder={
                    isEdicao ? "Deixe em branco para manter a atual" : "Digite uma senha"
                  }
                  secureTextEntry
                  autoComplete="new-password"
                  onSubmitEditing={salvar}
                  erro={senhaCurta ? `Mínimo de ${SENHA_MINIMA} caracteres.` : null}
                />
                {!senhaCurta ? (
                  <Text style={styles.dica}>Mínimo de {SENHA_MINIMA} caracteres.</Text>
                ) : null}
              </View>
            </View>
          </Cartao>
        </View>

        <View style={styles.botoes}>
          <BotaoContorno onPress={voltarParaLista}>Cancelar</BotaoContorno>
          <BotaoPrimario
            onPress={salvar}
            loading={salvarMutation.isPending}
            disabled={salvarMutation.isPending || senhaCurta}
          >
            {salvarMutation.isPending
              ? "Salvando..."
              : isEdicao
                ? "Salvar alterações"
                : "Cadastrar usuário"}
          </BotaoPrimario>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    flex: 1,
  },
  // em tela larga os dois cartões ficam lado a lado; se não couberem, o de dados desce
  cartoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 20,
  },
  cartaoPerfil: {
    flexGrow: 1,
    flexBasis: 340,
  },
  cartaoDados: {
    flexGrow: 2,
    flexBasis: 520,
  },
  voltar: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  voltarTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.azul,
  },
  descricao: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: cores.textoSecundario,
  },
  conteudo: {
    marginTop: 24,
    gap: 20,
  },
  cartao: {
    padding: 28,
  },
  perfis: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  perfil: {
    flexGrow: 1,
    flexBasis: 260,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.branco,
  },
  perfilAtivo: {
    borderWidth: 2,
    padding: 13,
    borderColor: cores.azul,
    backgroundColor: cores.selecionado,
  },
  perfilTextos: {
    flex: 1,
    paddingTop: 8,
  },
  perfilTitulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  perfilDescricao: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 19.6,
    color: cores.textoSecundario,
  },
  campos: {
    marginTop: 20,
    gap: 20,
  },
  duasColunas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  coluna: {
    flexGrow: 1,
    flexBasis: 260,
  },
  dica: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
});
