import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { Avatar, Icon, IconButton } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import { sair } from "@/lib/api";
import { iniciais, PERFIS } from "@/lib/formatadores";
import { FaixaTopo } from "@/components/FaixaTopo";
import { useSessaoStore } from "@/store/sessaoStore";
import { cores } from "@/theme";
import type { Role } from "@/types/usuario";

interface ItemMenu {
  href: Href;
  rotulo: string;
  icone: string;
  exato?: boolean;
}

const MENU: Record<Role, ItemMenu[]> = {
  admin: [
    { href: "/admin", rotulo: "Painel", icone: "view-grid-outline", exato: true },
    { href: "/admin/usuarios", rotulo: "Usuários", icone: "account-group-outline" },
    { href: "/admin/visitas", rotulo: "Visitas", icone: "map-marker-outline" },
    { href: "/admin/questionario", rotulo: "Questionário", icone: "clipboard-list-outline" },
  ],
  gestor: [
    { href: "/gestor/fiscalizadores", rotulo: "Fiscalizadores", icone: "account-group-outline" },
    { href: "/gestor/visitas/nova", rotulo: "Nova visita", icone: "plus-box-outline" },
    { href: "/gestor/visitas", rotulo: "Visitas", icone: "filter-variant", exato: true },
  ],
  fiscalizador: [],
};

function estaAtivo(caminho: string, item: ItemMenu) {
  const destino = String(item.href);
  if (item.exato) return caminho === destino;
  return caminho === destino || caminho.startsWith(`${destino}/`);
}

export function MenuLateral() {
  const usuario = useSessaoStore((state) => state.usuario);
  const caminho = usePathname();
  const sairMutation = useMutation({ mutationFn: sair });
  const perfil = usuario ? PERFIS[usuario.role] : "";

  return (
    <View style={styles.menu}>
      <View style={styles.faixa}>
        <FaixaTopo altura={18} />
      </View>
      <View style={styles.marca}>
        <View>
          <Text style={styles.marcaNome}>Constata</Text>
          <Text style={styles.marcaOrgao}>Procon Jaboatão</Text>
        </View>
      </View>

      <View style={styles.itens} accessibilityRole="menu">
        {usuario &&
          MENU[usuario.role].map((item) => {
            const ativo = estaAtivo(caminho, item);
            return (
              <Pressable
                key={item.rotulo}
                onPress={() => router.navigate(item.href)}
                style={[styles.item, ativo && styles.itemAtivo]}
                accessibilityRole="link"
                accessibilityState={{ selected: ativo }}
              >
                <Icon
                  source={item.icone}
                  size={20}
                  color={ativo ? cores.amarelo : cores.azulMenuTexto}
                />
                <Text style={[styles.itemTexto, ativo && styles.itemTextoAtivo]}>
                  {item.rotulo}
                </Text>
              </Pressable>
            );
          })}
      </View>

      <View style={styles.usuario}>
        <Avatar.Text
          size={36}
          label={iniciais(usuario?.nome)}
          style={styles.avatar}
          labelStyle={styles.avatarTexto}
          color={cores.azulEscuro}
        />
        <View style={styles.usuarioTextos}>
          <Text style={styles.usuarioNome} numberOfLines={1}>
            {usuario?.nome}
          </Text>
          <Text style={styles.usuarioEmail} numberOfLines={1}>
            {perfil}
          </Text>
        </View>
        <IconButton
          icon="logout"
          iconColor={cores.branco}
          size={20}
          onPress={() => sairMutation.mutate()}
          disabled={sairMutation.isPending}
          accessibilityLabel="Sair"
          style={styles.sair}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    width: 249,
    padding: 16,
    paddingVertical: 28,
    backgroundColor: cores.azulEscuro,
  },
  faixa: {
    marginTop: -28,
    marginHorizontal: -16,
    marginBottom: 28,
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
    marginTop: 32,
    gap: 2,
  },
  item: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemAtivo: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
  },
  itemTexto: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: cores.azulMenuTexto,
  },
  itemTextoAtivo: {
    fontFamily: "Inter_600SemiBold",
    color: cores.branco,
  },
  usuario: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  avatar: {
    backgroundColor: cores.amarelo,
  },
  avatarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
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
  usuarioEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: cores.azulMenuTexto,
  },
  sair: {
    margin: 0,
  },
});
