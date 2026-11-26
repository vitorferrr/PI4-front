import type { ReactNode } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Button, Icon, TextInput, type TextInputProps } from "react-native-paper";
import { PERFIL_ROTULO } from "@/lib/rotulos";
import { STATUS_VISITA } from "@/lib/visitas";
import { cores } from "@/theme";
import type { Role, StatusVisita } from "@/types";

const STATUS_CORES: Record<StatusVisita, { fundo: string; texto: string }> = {
  agendada: { fundo: cores.atribuidaFundo, texto: cores.atribuida },
  em_andamento: { fundo: cores.infoFundo, texto: cores.info },
  concluida: { fundo: cores.sucessoFundo, texto: cores.sucesso },
  cancelada: { fundo: cores.neutroFundo, texto: cores.neutro },
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: StatusVisita | string | undefined;
  size?: "sm" | "md";
}) {
  const conhecido = status && status in STATUS_VISITA ? (status as StatusVisita) : null;
  const cor = conhecido ? STATUS_CORES[conhecido] : STATUS_CORES.cancelada;
  return (
    <View style={[styles.selo, size === "md" && styles.seloGrande, { backgroundColor: cor.fundo }]}>
      <Text
        style={[styles.seloTexto, size === "md" && styles.seloTextoGrande, { color: cor.texto }]}
      >
        {conhecido ? STATUS_VISITA[conhecido] : "Status não informado"}
      </Text>
    </View>
  );
}

const PERFIL_CORES: Record<Role, { fundo: string; texto: string }> = {
  admin: { fundo: cores.avisoFundo, texto: cores.aviso },
  gestor: { fundo: cores.enviadaFundo, texto: cores.enviada },
  fiscalizador: { fundo: cores.atribuidaFundo, texto: cores.atribuida },
};

export function PerfilBadge({ role }: { role: Role }) {
  const cor = PERFIL_CORES[role] ?? PERFIL_CORES.fiscalizador;
  return (
    <View style={[styles.selo, { backgroundColor: cor.fundo }]}>
      <Text style={[styles.seloTexto, { color: cor.texto }]}>{PERFIL_ROTULO[role] ?? role}</Text>
    </View>
  );
}

export function Avatar({
  iniciais,
  size = 36,
  tone = "light",
}: {
  iniciais: string;
  size?: number;
  tone?: "light" | "accent";
}) {
  const destaque = tone === "accent";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: destaque ? cores.amarelo : cores.atribuidaFundo,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarTexto,
          {
            fontSize: size >= 44 ? 16 : 13,
            color: destaque ? cores.azulEscuro : cores.atribuida,
          },
        ]}
      >
        {iniciais}
      </Text>
    </View>
  );
}

export function LogoMark({
  size = 36,
  variant = "accent",
}: {
  size?: number;
  variant?: "accent" | "navy";
}) {
  const destaque = variant === "accent";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          backgroundColor: destaque ? cores.amarelo : cores.azulEscuro,
        },
      ]}
    >
      <Icon
        source="shield-check-outline"
        size={size * 0.6}
        color={destaque ? cores.azulEscuro : cores.amarelo}
      />
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.cabecalho}>
      <View style={styles.cabecalhoTextos}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.tituloPagina} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
      {actions ? <View style={styles.acoes}>{actions}</View> : null}
    </View>
  );
}

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.cartao, style]}>{children}</View>;
}

export function TituloCartao({ children }: { children: ReactNode }) {
  return <Text style={styles.tituloCartao}>{children}</Text>;
}

export function Campo({
  rotulo,
  erro,
  ...props
}: Omit<TextInputProps, "mode" | "error"> & {
  rotulo: string;
  erro?: string | null;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        mode="outlined"
        accessibilityLabel={rotulo}
        error={Boolean(erro)}
        outlineColor={cores.bordaCampo}
        outlineStyle={styles.campoBorda}
        style={styles.campoTexto}
        placeholderTextColor="#757575"
        {...props}
      />
      {erro ? <Text style={styles.campoErro}>{erro}</Text> : null}
    </View>
  );
}

type BotaoProps = {
  children: ReactNode;
  onPress?: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BotaoPrimario({ children, icon, style, ...props }: BotaoProps) {
  return (
    <Button
      mode="contained"
      icon={icon}
      style={[styles.botao, style]}
      contentStyle={styles.botaoConteudo}
      labelStyle={styles.botaoTexto}
      {...props}
    >
      {children}
    </Button>
  );
}

export function BotaoContorno({ children, icon, style, ...props }: BotaoProps) {
  return (
    <Button
      mode="outlined"
      icon={icon}
      style={[styles.botao, styles.botaoContorno, style]}
      contentStyle={styles.botaoConteudo}
      labelStyle={styles.botaoTexto}
      {...props}
    >
      {children}
    </Button>
  );
}

export function Mensagem({ children }: { children: ReactNode; carregando?: boolean }) {
  return (
    <Text style={styles.mensagem} accessibilityRole="text">
      {children}
    </Text>
  );
}

export function ErroCarga({
  mensagem,
  onTentar,
  tentando,
}: {
  mensagem: ReactNode;
  onTentar?: () => void;
  tentando?: boolean;
}) {
  return (
    <View style={styles.erroCaixa} accessibilityRole="alert">
      <Text style={styles.erroTexto}>{mensagem}</Text>
      {onTentar ? (
        <BotaoContorno onPress={onTentar} disabled={tentando}>
          {tentando ? "Tentando novamente…" : "Tentar novamente"}
        </BotaoContorno>
      ) : null}
    </View>
  );
}

export function ListaErros({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) return null;
  const [principal, ...detalhes] = mensagens;
  return (
    <View style={styles.listaErros} accessibilityRole="alert">
      <Text style={[styles.erroTexto, styles.erroPrincipal]}>{principal}</Text>
      {detalhes.map((mensagem, indice) => (
        <Text key={indice} style={styles.erroTexto}>
          • {mensagem}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  seloGrande: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seloTexto: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  seloTextoGrande: {
    fontSize: 14,
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTexto: {
    fontFamily: "Inter_700Bold",
  },
  logo: {
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cabecalho: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  cabecalhoTextos: {
    flexShrink: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.verdeTitulo,
  },
  tituloPagina: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 42,
    lineHeight: 44,
    textTransform: "uppercase",
    color: cores.azulEscuro,
  },
  acoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  cartao: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.bordaClara,
    backgroundColor: cores.branco,
  },
  tituloCartao: {
    fontFamily: "BarlowCondensed_800ExtraBold",
    fontSize: 23,
    color: cores.azulEscuro,
  },
  campo: {
    gap: 8,
  },
  rotulo: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.texto,
  },
  campoTexto: {
    backgroundColor: cores.branco,
    fontSize: 15,
  },
  campoBorda: {
    borderRadius: 12,
  },
  campoErro: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: cores.erroForte,
  },
  botao: {
    borderRadius: 10,
  },
  botaoContorno: {
    borderColor: cores.azul,
    backgroundColor: cores.branco,
  },
  botaoConteudo: {
    height: 44,
    paddingHorizontal: 6,
  },
  botaoTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  mensagem: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoSecundario,
  },
  erroCaixa: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: cores.erroFundo,
  },
  erroTexto: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.erroTexto,
  },
  erroPrincipal: {
    fontFamily: "Inter_600SemiBold",
  },
  listaErros: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: cores.erroFundo,
  },
});
