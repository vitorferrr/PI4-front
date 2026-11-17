import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import SignatureCanvas, { type SignatureViewRef } from "react-native-signature-canvas";

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
  body, html { background-color: #F7FAFD; }
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
          penColor="#0F1E33"
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
        <Pressable
          style={[styles.botao, styles.botaoLimpar]}
          accessibilityRole="button"
          onPress={limpar}
        >
          <Text style={styles.botaoLimparTexto}>Limpar</Text>
        </Pressable>
        <Pressable
          style={[styles.botao, styles.botaoConfirmar]}
          accessibilityRole="button"
          onPress={confirmar}
        >
          <Text style={styles.botaoConfirmarTexto}>Confirmar assinatura</Text>
        </Pressable>
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
    backgroundColor: "#F7FAFD",
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
    borderColor: "#8A9AB0",
  },
  linhaBase: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
    height: 1.5,
    backgroundColor: "#C5D3E3",
  },
  dica: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#4A5B73",
  },
  aviso: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#A12A20",
  },
  botoes: {
    flexDirection: "row",
    gap: 10,
  },
  botao: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  botaoLimpar: {
    borderWidth: 1.5,
    borderColor: "#C5D3E3",
  },
  botaoLimparTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#0F1E33",
  },
  botaoConfirmar: {
    backgroundColor: "#1D3F94",
  },
  botaoConfirmarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
