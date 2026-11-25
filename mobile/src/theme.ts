import { MD3LightTheme, configureFonts, type MD3Theme } from "react-native-paper";

export const cores = {
  azul: "#1D3F94",
  azulEscuro: "#172F6E",
  amarelo: "#FFCC00",
  fundo: "#F3F7FB",
  branco: "#FFFFFF",
  texto: "#0F1E33",
  textoSecundario: "#4A5B73",
  textoApagado: "#8A9AB0",
  borda: "#C5D3E3",
  bordaClara: "#DCE5EF",
  erro: "#A12A20",
  erroFundo: "#FDE8E6",
  sucesso: "#17803F",
  sucessoFundo: "#E2F5EA",
  avisoTexto: "#5C3F00",
  avisoFundo: "#FFF4D6",
};

const fontesBase = configureFonts({
  config: { fontFamily: "Inter_400Regular", fontWeight: "normal" },
});

const negrito = { fontFamily: "Inter_700Bold", fontWeight: "normal" } as const;

export const tema: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: cores.azul,
    onPrimary: cores.branco,
    primaryContainer: "#D6E6F8",
    onPrimaryContainer: cores.azulEscuro,
    secondary: cores.azulEscuro,
    onSecondary: cores.branco,
    tertiary: cores.amarelo,
    onTertiary: cores.texto,
    error: cores.erro,
    onError: cores.branco,
    errorContainer: cores.erroFundo,
    onErrorContainer: cores.erro,
    background: cores.fundo,
    onBackground: cores.texto,
    surface: cores.branco,
    onSurface: cores.texto,
    surfaceVariant: "#E8EEF7",
    onSurfaceVariant: cores.textoSecundario,
    outline: cores.borda,
    outlineVariant: cores.bordaClara,
  },
  fonts: {
    ...fontesBase,
    titleLarge: { ...fontesBase.titleLarge, ...negrito },
    titleMedium: { ...fontesBase.titleMedium, ...negrito },
    titleSmall: { ...fontesBase.titleSmall, ...negrito },
    labelLarge: { ...fontesBase.labelLarge, ...negrito },
    labelMedium: { ...fontesBase.labelMedium, ...negrito },
  },
};
