import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import SignatureCanvas, { type SignatureViewRef } from "react-native-signature-canvas";
import { cores } from "@/theme";

interface SignaturePadProps {
  onConfirmar: (imagemBase64: string) => void;
  onInicioDesenho?: () => void;
  onFimDesenho?: () => void;
  altura?: number;
}

const ESTILO_WEB = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { background-color: ${cores.fundoAssinatura}; }
`;

export function SignaturePad({
  onConfirmar,
  onInicioDesenho,
  onFimDesenho,
  altura = 92,
}: SignaturePadProps) {
  const canvasRef = useRef<SignatureViewRef>(null);
  const [comecouAssinar, setComecouAssinar] = useState(false);
  const [avisoVazio, setAvisoVazio] = useState(false);

  const onFimDesenhoRef = useRef(onFimDesenho);
  useEffect(() => {
    onFimDesenhoRef.current = onFimDesenho;
  });

  useEffect(() => {
    return () => onFimDesenhoRef.current?.();
  }, []);

  function limpar() {
    canvasRef.current?.clearSignature();
    setComecouAssinar(false);
    setAvisoVazio(false);
    onFimDesenho?.();
  }

  function confirmar() {
    onFimDesenho?.();
    canvasRef.current?.readSignature();
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.area, { height: altura }]}
        accessibilityLabel="Área para assinar com o dedo"
      >
        <SignatureCanvas
          ref={canvasRef}
          style={styles.canvas}
          webStyle={ESTILO_WEB}
          penColor={cores.texto}
          imageType="image/png"
          trimWhitespace
          onBegin={() => {
            setComecouAssinar(true);
            setAvisoVazio(false);
            onInicioDesenho?.();
          }}
          onEnd={() => onFimDesenho?.()}
          onOK={onConfirmar}
          onEmpty={() => setAvisoVazio(true)}
        />

        <View style={styles.linhaBase} pointerEvents="none" />
        {!comecouAssinar && (
          <Text style={styles.dica} pointerEvents="none">
            Assine aqui com o dedo
          </Text>
        )}

        <View style={styles.borda} pointerEvents="none" />
      </View>

      {avisoVazio && <Text style={styles.aviso}>Faça a assinatura antes de confirmar.</Text>}

      <View style={styles.botoes}>
        <Button
          mode="outlined"
          onPress={limpar}
          textColor={cores.texto}
          style={[styles.botao, styles.botaoLimpar]}
          contentStyle={styles.botaoConteudo}
          labelStyle={styles.botaoTexto}
        >
          Limpar
        </Button>
        <Button
          mode="contained"
          onPress={confirmar}
          style={styles.botao}
          contentStyle={styles.botaoConteudo}
          labelStyle={styles.botaoTexto}
        >
          Confirmar assinatura
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  area: {
    borderRadius: 12,
    backgroundColor: cores.fundoAssinatura,
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
    margin: 4,
  },
  borda: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: cores.textoApagado,
  },
  linhaBase: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
    height: 1.5,
    backgroundColor: cores.borda,
  },
  dica: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.textoSecundario,
  },
  aviso: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.erro,
  },
  botoes: {
    flexDirection: "row",
    gap: 10,
  },
  botao: {
    flex: 1,
    borderRadius: 12,
  },
  botaoConteudo: {
    height: 44,
  },
  botaoLimpar: {
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
  botaoTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginHorizontal: 8,
  },
});
