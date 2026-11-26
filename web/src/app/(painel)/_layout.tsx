import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Link, Redirect, Slot, usePathname, type Href } from "expo-router";
import { Icon, IconButton } from "react-native-paper";
import { sair } from "@/lib/api";
import { isTokenValid, useSession } from "@/lib/session";
import { iniciais } from "@/lib/visitas";
import { PERFIL_ROTULO } from "@/lib/rotulos";
import { Avatar, LogoMark } from "@/components/ui";
import { cores } from "@/theme";
import type { Role } from "@/types";

interface ItemMenu {
  href: Href;
  rotulo: string;
  icone: string;
  // true: só fica ativo no endereço exato (como o "end" do NavLink antigo)
  exato?: boolean;
}

const MENU: Partial<Record<Role, ItemMenu[]>> = {
  admin: [
    {
      href: "/admin",
      rotulo: "Painel",
      icone: "view-grid-outline",
      exato: true,
    },
    {
      href: "/admin/usuarios",
      rotulo: "Usuários",
      icone: "account-group-outline",
    },
    { href: "/admin/visitas", rotulo: "Visitas", icone: "map-marker-outline" },
  ],
  gestor: [
    {
      href: "/gestor/fiscalizadores",
      rotulo: "Fiscalizadores",
      icone: "account-group-outline",
    },
    {
      href: "/gestor/visitas/nova",
      rotulo: "Nova visita",
      icone: "plus-box-outline",
    },
    {
      href: "/gestor/visitas",
      rotulo: "Visitas",
      icone: "filter-variant",
      exato: true,
    },
  ],
};

function estaAtivo(caminho: string, item: ItemMenu) {
  const destino = String(item.href);
  return item.exato
    ? caminho === destino
    : caminho === destino || caminho.startsWith(`${destino}/`);
}

// Equivale ao PrivateRoute + AppLayout antigos: sem sessão vai para o login; com sessão mostra o menu
export default function PainelLayout() {
  const token = useSession((state) => state.token);
  const versao = useSession((state) => state.version);
  const role = useSession((state) =>
    typeof state.claims?.role === "string" ? state.claims.role : null
  ) as Role | null;
  const usuario = useSession((state) => state.usuario);
  const caminho = usePathname();
  const [saindo, setSaindo] = useState(false);

  if (!isTokenValid(token)) return <Redirect href="/login" />;

  const rotuloPerfil = role ? (PERFIL_ROTULO[role] ?? role) : "";
  const nome = usuario?.nome ?? rotuloPerfil;

  async function handleSair() {
    if (saindo) return;
    setSaindo(true);
    await sair();
  }

  return (
    <View style={styles.tela}>
      <View style={styles.menu}>
        <View style={styles.marca}>
          <LogoMark />
          <View>
            <Text style={styles.marcaNome}>Constata</Text>
            <Text style={styles.marcaOrgao}>
              Procon Jaboatão{rotuloPerfil ? ` · ${rotuloPerfil}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.itens} accessibilityRole="menu" aria-label="Menu principal">
          {(role ? (MENU[role] ?? []) : []).map((item) => {
            const ativo = estaAtivo(caminho, item);
            return (
              <Link key={String(item.href)} href={item.href} asChild>
                <Pressable
                  style={[styles.item, ativo && styles.itemAtivo]}
                  accessibilityRole="link"
                  accessibilityState={{ selected: ativo }}
                >
                  <Icon
                    source={item.icone}
                    size={20}
                    color={ativo ? cores.azulEscuro : cores.branco}
                  />
                  <Text style={[styles.itemTexto, ativo && styles.itemTextoAtivo]}>
                    {item.rotulo}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <View style={styles.usuario}>
          <Avatar iniciais={iniciais(nome)} tone="accent" />
          <View style={styles.usuarioTextos}>
            <Text style={styles.usuarioNome} numberOfLines={1}>
              {nome}
            </Text>
            <Text style={styles.usuarioDetalhe} numberOfLines={1}>
              {usuario?.email ?? rotuloPerfil}
            </Text>
          </View>
          <IconButton
            icon="logout"
            iconColor={cores.branco}
            size={20}
            onPress={handleSair}
            disabled={saindo}
            accessibilityLabel="Sair"
            style={styles.sair}
          />
        </View>
      </View>

      <ScrollView style={styles.principal} contentContainerStyle={styles.principalConteudo}>
        {/* a key reinicia as telas quando a conta muda em outra aba, como no PrivateRoute antigo */}
        <View key={versao} style={styles.pagina}>
          <Slot />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: cores.fundo,
  },
  menu: {
    width: 249,
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 28,
    backgroundColor: cores.azulEscuro,
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  marcaNome: {
    fontFamily: "BarlowCondensed_900Black",
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: cores.branco,
  },
  marcaOrgao: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: cores.azulMenuTexto,
  },
  itens: {
    marginTop: 28,
    gap: 4,
  },
  item: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  itemAtivo: {
    backgroundColor: cores.branco,
  },
  itemTexto: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: cores.branco,
  },
  itemTextoAtivo: {
    fontFamily: "Inter_700Bold",
    color: cores.azulEscuro,
  },
  usuario: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: cores.azulMenu,
  },
  usuarioTextos: {
    flex: 1,
    minWidth: 0,
  },
  usuarioNome: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: cores.branco,
  },
  usuarioDetalhe: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: cores.azulMenuTexto,
  },
  sair: {
    margin: 0,
  },
  principal: {
    flex: 1,
  },
  principalConteudo: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 48,
  },
  pagina: {
    flex: 1,
  },
});
