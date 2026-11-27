import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Button, RadioButton } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Campo } from "@/components/Campo";
import { CartaoSecao } from "@/components/CartaoSecao";
import { MensagemErro } from "@/components/MensagemErro";
import { cores } from "@/theme";
import type { Usuario } from "@/types/usuario";

const SENHA_MINIMA = 6;

const PERFIS_CADASTRO = [
  {
    valor: "fiscalizador",
    titulo: "Fiscalizador",
    descricao: "Usa o app no celular. Recebe e executa visitas em campo.",
  },
  {
    valor: "gestor",
    titulo: "Gestor",
    descricao: "Usa o painel web. Cria e acompanha as visitas da equipe.",
  },
];

async function salvarUsuario(id: number | undefined, dados: Record<string, unknown>) {
  if (id) return api.put(`/usuarios/${id}`, dados);
  return api.post("/usuarios", dados);
}

function voltarParaLista() {
  router.navigate("/admin/usuarios");
}

export function FormularioUsuario({ usuario }: { usuario?: Usuario }) {
  const queryClient = useQueryClient();
  const edicao = Boolean(usuario);
  const [perfil, setPerfil] = useState(usuario?.role === "gestor" ? "gestor" : "fiscalizador");
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [matricula, setMatricula] = useState(usuario?.matricula ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [senha, setSenha] = useState("");
  const senhaCurta = senha.length > 0 && senha.trim().length < SENHA_MINIMA;

  const salvarMutation = useMutation({
    mutationFn: () =>
      salvarUsuario(usuario?.id, {
        nome: nome.trim(),
        email: email.trim(),
        role: perfil,
        matricula: matricula.trim() || null,
        ...(edicao && senha && { senha }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuario"] });
      voltarParaLista();
    },
  });

  function salvar() {
    if (!senhaCurta && !salvarMutation.isPending) salvarMutation.mutate();
  }

  return (
    <View style={styles.pagina}>
      <Button icon="chevron-left" onPress={voltarParaLista} style={styles.voltar} compact>
        Usuários
      </Button>

      <CabecalhoPagina
        titulo={edicao ? "Editar usuário" : "Novo usuário"}
        descricao={
          edicao
            ? "Altere os dados do servidor. Deixe a senha em branco para manter a atual."
            : "O servidor recebe no e-mail uma senha gerada automaticamente para entrar."
        }
      />

      {salvarMutation.isError && <MensagemErro erro={salvarMutation.error} />}

      <View style={styles.cartoes}>
        <CartaoSecao titulo="Perfil de acesso" style={styles.cartaoPerfil}>
          {PERFIS_CADASTRO.map((opcao) => (
            <Pressable
              key={opcao.valor}
              onPress={() => setPerfil(opcao.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: perfil === opcao.valor }}
              style={[styles.perfil, perfil === opcao.valor && styles.perfilAtivo]}
            >
              <RadioButton.Android
                value={opcao.valor}
                status={perfil === opcao.valor ? "checked" : "unchecked"}
                onPress={() => setPerfil(opcao.valor)}
              />
              <View style={styles.perfilTextos}>
                <Text style={styles.perfilTitulo}>{opcao.titulo}</Text>
                <Text style={styles.perfilDescricao}>{opcao.descricao}</Text>
              </View>
            </Pressable>
          ))}
        </CartaoSecao>

        <CartaoSecao titulo="Dados do servidor" style={styles.cartaoDados}>
          <Campo
            rotulo="Nome completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Nome completo"
          />
          <View style={styles.colunas}>
            <Campo
              rotulo="Matrícula (sai no documento da visita)"
              value={matricula}
              onChangeText={setMatricula}
              placeholder="ex.: 104512"
              style={styles.coluna}
            />
            <Campo
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.coluna}
            />
          </View>
          {edicao && (
            <Campo
              rotulo="Senha (opcional)"
              value={senha}
              onChangeText={setSenha}
              placeholder="Deixe em branco para manter a atual"
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={salvar}
              erro={senhaCurta ? `Mínimo de ${SENHA_MINIMA} caracteres.` : null}
              ajuda={`Mínimo de ${SENHA_MINIMA} caracteres.`}
            />
          )}
        </CartaoSecao>
      </View>

      <View style={styles.botoes}>
        <Button mode="outlined" onPress={voltarParaLista} style={styles.botaoContorno}>
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={salvar}
          loading={salvarMutation.isPending}
          disabled={salvarMutation.isPending}
        >
          {edicao ? "Salvar alterações" : "Cadastrar e enviar senha"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pagina: {
    gap: 24,
  },
  voltar: {
    alignSelf: "flex-start",
    marginBottom: -16,
  },
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
  perfil: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  perfilAtivo: {
    borderColor: cores.azul,
    backgroundColor: cores.selecionado,
  },
  perfilTextos: {
    flex: 1,
    paddingTop: 8,
    gap: 4,
  },
  perfilTitulo: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  perfilDescricao: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: cores.textoSecundario,
  },
  colunas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  coluna: {
    flexGrow: 1,
    flexBasis: 240,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  botaoContorno: {
    borderColor: cores.azul,
  },
});
