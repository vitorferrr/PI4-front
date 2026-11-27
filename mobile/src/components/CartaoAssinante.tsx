import { useState } from "react";
import { View, Text, Image, Alert, StyleSheet } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { ActivityIndicator, Button, HelperText, Icon, TextInput } from "react-native-paper";
import { SignaturePad } from "@/components/SignaturePad";
import { cores } from "@/theme";
import { formatarHora } from "@/lib/formatadores";
import type { AssinaturaColetada } from "@/store/visitaEmAndamentoStore";

const EMAIL_VALIDO = /^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[^\s@<>,;:"()[\]\\]+$/;

interface DadosAssinante {
  nome: string;
  email?: string;
}

interface CartaoAssinanteProps {
  rotulo: string;
  situacao: "ativo" | "aguardando";
  assinatura?: AssinaturaColetada;
  nomeFixo?: string;
  rotuloCampoNome?: string;
  permitirRecusa?: boolean;
  pedirEmail?: boolean;
  onConfirmar: (dados: DadosAssinante & { imagem: string }) => void;
  onRecusar?: (dados: DadosAssinante) => void;
  onRefazer?: () => void;
  enviando?: boolean;
  aviso?: string;
  onInicioDesenho?: () => void;
  onFimDesenho?: () => void;
}

export function CartaoAssinante({
  rotulo,
  situacao,
  assinatura,
  nomeFixo,
  rotuloCampoNome,
  permitirRecusa = false,
  pedirEmail = false,
  onConfirmar,
  onRecusar,
  onRefazer,
  enviando = false,
  aviso,
  onInicioDesenho,
  onFimDesenho,
}: CartaoAssinanteProps) {
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [avisoNome, setAvisoNome] = useState(false);
  const [emailDigitado, setEmailDigitado] = useState("");
  const [avisoEmail, setAvisoEmail] = useState(false);

  const nome = (nomeFixo ?? nomeDigitado).trim();
  const email = emailDigitado.trim();

  if (assinatura) {
    const hora = formatarHora(assinatura.assinadoEm);
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.cartao}>
        <View style={styles.linha}>
          <Animated.View
            entering={ZoomIn.delay(120).duration(260)}
            style={[styles.icone, assinatura.recusou ? styles.iconeRecusa : styles.iconeOk]}
          >
            <Icon
              source={assinatura.recusou ? "exclamation-thick" : "check-bold"}
              size={16}
              color={assinatura.recusou ? cores.erro : cores.sucesso}
            />
          </Animated.View>
          <View style={styles.textos}>
            <Text style={styles.nome}>
              {rotulo}: {assinatura.nome}
            </Text>
            <Text style={styles.detalhe}>
              {assinatura.recusou ? `Recusou-se a assinar às ${hora}` : `Assinado às ${hora}`}
            </Text>
          </View>
          {onRefazer && (
            <Button mode="text" onPress={onRefazer} labelStyle={styles.link}>
              Refazer
            </Button>
          )}
        </View>
        {assinatura.imagemUri && (
          <Image
            source={{ uri: assinatura.imagemUri }}
            style={styles.imagem}
            resizeMode="contain"
            accessibilityLabel={`Assinatura de ${assinatura.nome}`}
          />
        )}
      </Animated.View>
    );
  }

  if (situacao === "aguardando") {
    return (
      <View style={[styles.cartao, styles.cartaoAguardando]}>
        <Text style={styles.nome}>{nomeFixo ? `${rotulo}: ${nomeFixo}` : rotulo}</Text>
        <Text style={styles.detalhe}>Aguardando a assinatura anterior</Text>
      </View>
    );
  }

  function dadosValidos() {
    const nomeOk = Boolean(nome);
    const emailOk = !pedirEmail || email === "" || EMAIL_VALIDO.test(email);
    setAvisoNome(!nomeOk);
    setAvisoEmail(!emailOk);
    return nomeOk && emailOk;
  }

  function dadosDoAssinante(): DadosAssinante {
    return pedirEmail && email ? { nome, email } : { nome };
  }

  function confirmar(imagem: string) {
    if (enviando) return;
    if (!dadosValidos()) return;
    onConfirmar({ ...dadosDoAssinante(), imagem });
  }

  function recusar() {
    if (enviando) return;
    if (!dadosValidos()) return;
    Alert.alert("Registrar recusa", `Confirmar que ${nome} se recusou a assinar o documento?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar recusa",
        style: "destructive",
        onPress: () => onRecusar?.(dadosDoAssinante()),
      },
    ]);
  }

  return (
    <View style={[styles.cartao, styles.cartaoAtivo]}>
      {nomeFixo ? (
        <Text style={styles.rotuloAtivo}>
          {rotulo}: {nomeFixo}
        </Text>
      ) : (
        <View style={styles.campoNome}>
          <Text style={styles.rotuloAtivo}>{rotuloCampoNome ?? rotulo}</Text>
          <TextInput
            mode="outlined"
            value={nomeDigitado}
            onChangeText={(texto) => {
              setNomeDigitado(texto);
              setAvisoNome(false);
            }}
            placeholder="Nome e cargo"
            placeholderTextColor={cores.textoApagado}
            accessibilityLabel={rotuloCampoNome ?? rotulo}
            error={avisoNome}
            outlineColor={cores.borda}
            outlineStyle={styles.campoBorda}
            style={styles.input}
          />
          {avisoNome && (
            <HelperText type="error" style={styles.aviso}>
              Informe o nome antes de continuar.
            </HelperText>
          )}

          {pedirEmail && (
            <>
              <Text style={styles.rotuloAtivo}>
                E-mail <Text style={styles.opcional}>(opcional, para receber o documento)</Text>
              </Text>
              <TextInput
                mode="outlined"
                value={emailDigitado}
                onChangeText={(texto) => {
                  setEmailDigitado(texto);
                  setAvisoEmail(false);
                }}
                placeholder="email@exemplo.com"
                placeholderTextColor={cores.textoApagado}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="E-mail do responsável"
                error={avisoEmail}
                outlineColor={cores.borda}
                outlineStyle={styles.campoBorda}
                style={styles.input}
              />
              {avisoEmail && (
                <HelperText type="error" style={styles.aviso}>
                  Informe um e-mail válido.
                </HelperText>
              )}
            </>
          )}
        </View>
      )}

      {aviso && <Text style={styles.avisoCartao}>{aviso}</Text>}

      <View pointerEvents={enviando ? "none" : "auto"} style={enviando && styles.bloqueado}>
        <SignaturePad
          onConfirmar={confirmar}
          onInicioDesenho={onInicioDesenho}
          onFimDesenho={onFimDesenho}
        />
      </View>

      {enviando && (
        <View style={styles.enviando}>
          <ActivityIndicator />
          <Text style={styles.detalhe}>Enviando assinatura...</Text>
        </View>
      )}

      {permitirRecusa && !enviando && (
        <Button
          mode="text"
          onPress={recusar}
          style={styles.botaoRecusa}
          contentStyle={styles.botaoRecusaConteudo}
          labelStyle={styles.link}
        >
          {rotulo} se recusou a assinar
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  opcional: {
    fontFamily: "Inter_400Regular",
    color: cores.textoSecundario,
  },
  avisoCartao: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: cores.avisoTexto,
  },
  bloqueado: {
    opacity: 0.5,
  },
  enviando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartao: {
    gap: 10,
    padding: 14,
    borderRadius: 4,
    borderBottomRightRadius: 18,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.bordaClara,
  },
  cartaoAtivo: {
    borderWidth: 2,
    borderColor: cores.azul,
  },
  cartaoAguardando: {
    gap: 2,
    opacity: 0.6,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  iconeOk: {
    backgroundColor: cores.sucessoFundo,
  },
  iconeRecusa: {
    backgroundColor: cores.erroFundo,
  },
  textos: {
    flex: 1,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  link: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  imagem: {
    height: 60,
    width: "100%",
  },
  rotuloAtivo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  campoNome: {
    gap: 6,
  },
  input: {
    backgroundColor: cores.branco,
  },
  campoBorda: {
    borderRadius: 4,
    borderWidth: 1.5,
  },
  aviso: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    paddingHorizontal: 0,
  },
  botaoRecusa: {
    alignSelf: "flex-start",
  },
  botaoRecusaConteudo: {
    minHeight: 44,
  },
});
