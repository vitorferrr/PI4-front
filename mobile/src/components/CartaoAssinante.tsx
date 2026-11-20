import { useState } from "react";
import { View, Text, TextInput, Image, Pressable, Alert, StyleSheet } from "react-native";
import { SignaturePad } from "@/components/SignaturePad";
import { formatarHora } from "@/lib/formatadores";
import type { AssinaturaColetada } from "@/store/visitaEmAndamentoStore";

interface CartaoAssinanteProps {
  rotulo: string;
  situacao: "ativo" | "aguardando";
  assinatura?: AssinaturaColetada;
  nomeFixo?: string;
  rotuloCampoNome?: string;
  permitirRecusa?: boolean;
  onConfirmar: (dados: { nome: string; imagem: string }) => void;
  onRecusar?: (nome: string) => void;
  onRefazer: () => void;
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
  onConfirmar,
  onRecusar,
  onRefazer,
  onInicioDesenho,
  onFimDesenho,
}: CartaoAssinanteProps) {
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [avisoNome, setAvisoNome] = useState(false);

  const nome = (nomeFixo ?? nomeDigitado).trim();

  if (assinatura) {
    const hora = formatarHora(assinatura.assinadoEm);
    return (
      <View style={styles.cartao}>
        <View style={styles.linha}>
          <View style={[styles.icone, assinatura.recusou ? styles.iconeRecusa : styles.iconeOk]}>
            <Text
              style={[
                styles.iconeTexto,
                assinatura.recusou ? styles.iconeTextoRecusa : styles.iconeTextoOk,
              ]}
            >
              {assinatura.recusou ? "!" : "✓"}
            </Text>
          </View>
          <View style={styles.textos}>
            <Text style={styles.nome}>
              {rotulo} · {assinatura.nome}
            </Text>
            <Text style={styles.detalhe}>
              {assinatura.recusou ? `Recusou-se a assinar · ${hora}` : `Assinado às ${hora}`}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onRefazer}>
            <Text style={styles.link}>Refazer</Text>
          </Pressable>
        </View>
        {assinatura.imagem && (
          <Image
            source={{ uri: assinatura.imagem }}
            style={styles.imagem}
            resizeMode="contain"
            accessibilityLabel={`Assinatura de ${assinatura.nome}`}
          />
        )}
      </View>
    );
  }

  if (situacao === "aguardando") {
    return (
      <View style={[styles.cartao, styles.cartaoAguardando]}>
        <Text style={styles.nome}>{nomeFixo ? `${rotulo} · ${nomeFixo}` : rotulo}</Text>
        <Text style={styles.detalhe}>Aguardando a assinatura anterior</Text>
      </View>
    );
  }

  function confirmar(imagem: string) {
    if (!nome) {
      setAvisoNome(true);
      return;
    }
    onConfirmar({ nome, imagem });
  }

  function recusar() {
    if (!nome) {
      setAvisoNome(true);
      return;
    }
    Alert.alert("Registrar recusa", `Confirmar que ${nome} se recusou a assinar o documento?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar recusa", style: "destructive", onPress: () => onRecusar?.(nome) },
    ]);
  }

  return (
    <View style={[styles.cartao, styles.cartaoAtivo]}>
      {nomeFixo ? (
        <Text style={styles.rotuloAtivo}>
          {rotulo} · {nomeFixo}
        </Text>
      ) : (
        <View style={styles.campoNome}>
          <Text style={styles.rotuloAtivo}>{rotuloCampoNome ?? rotulo}</Text>
          <TextInput
            style={styles.input}
            value={nomeDigitado}
            onChangeText={(texto) => {
              setNomeDigitado(texto);
              setAvisoNome(false);
            }}
            placeholder="Nome e cargo"
            placeholderTextColor="#8A9AB0"
          />
          {avisoNome && <Text style={styles.aviso}>Informe o nome antes de continuar.</Text>}
        </View>
      )}

      <SignaturePad
        onConfirmar={confirmar}
        onInicioDesenho={onInicioDesenho}
        onFimDesenho={onFimDesenho}
      />

      {permitirRecusa && (
        <Pressable style={styles.botaoRecusa} accessibilityRole="button" onPress={recusar}>
          <Text style={styles.link}>{rotulo} se recusou a assinar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
  },
  cartaoAtivo: {
    borderWidth: 2,
    borderColor: "#1D3F94",
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
    backgroundColor: "#E2F5EA",
  },
  iconeRecusa: {
    backgroundColor: "#FDE8E6",
  },
  iconeTexto: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
  },
  iconeTextoOk: {
    color: "#17803F",
  },
  iconeTextoRecusa: {
    color: "#A12A20",
  },
  textos: {
    flex: 1,
  },
  nome: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#0F1E33",
  },
  detalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#4A5B73",
  },
  link: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#1D3F94",
    padding: 8,
  },
  imagem: {
    height: 60,
    width: "100%",
  },
  rotuloAtivo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0F1E33",
  },
  campoNome: {
    gap: 6,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F1E33",
  },
  aviso: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#A12A20",
  },
  botaoRecusa: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
});
