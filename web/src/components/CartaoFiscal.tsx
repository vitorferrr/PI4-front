import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Avatar, Button, Card } from "react-native-paper";
import { iniciais, primeiroNome } from "@/lib/formatadores";
import type { CargaFiscal } from "@/lib/visitas";
import { BarraCarga } from "@/components/BarraCarga";
import { cores } from "@/theme";
import type { Usuario } from "@/types/usuario";

function Numero({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <View style={styles.numero}>
      <Text style={[styles.numeroValor, destaque && styles.numeroDestaque]}>{valor}</Text>
      <Text style={styles.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

export function CartaoFiscal({ fiscal, carga }: { fiscal: Usuario; carga: CargaFiscal }) {
  const matricula = fiscal.matricula?.trim() ? `Mat. ${fiscal.matricula}` : "Sem matrícula";

  return (
    <Card mode="outlined" style={styles.cartao} contentStyle={styles.conteudo}>
      <View style={styles.pessoa}>
        <Avatar.Text
          size={48}
          label={iniciais(fiscal.nome)}
          style={styles.avatar}
          labelStyle={styles.avatarTexto}
          color={cores.atribuida}
        />
        <View style={styles.pessoaTextos}>
          <Text style={styles.nome} numberOfLines={1}>
            {fiscal.nome}
          </Text>
          <Text style={styles.detalhe} numberOfLines={1}>
            {matricula} · {fiscal.email}
          </Text>
        </View>
      </View>

      <View style={styles.abertas}>
        <Text style={styles.abertasRotulo}>Visitas abertas</Text>
        <Text style={styles.abertasValor}>{carga.abertas}</Text>
      </View>
      <BarraCarga abertas={carga.abertas} />

      <View style={styles.numeros}>
        <Numero valor={carga.vencemHoje} rotulo="para hoje" />
        <Numero valor={carga.atrasadas} rotulo="atrasadas" destaque={carga.atrasadas > 0} />
        <Numero valor={carga.noMes} rotulo="concluídas no mês" />
      </View>

      <Button
        mode="outlined"
        onPress={() =>
          router.push({ pathname: "/gestor/visitas/nova", params: { fiscal: fiscal.id } })
        }
      >
        Atribuir a {primeiroNome(fiscal.nome)}
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    borderRadius: 16,
    backgroundColor: cores.branco,
  },
  conteudo: {
    padding: 22,
    gap: 14,
  },
  pessoa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    backgroundColor: cores.atribuidaFundo,
  },
  avatarTexto: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  pessoaTextos: {
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
  abertas: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: -6,
  },
  abertasRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: cores.textoMedio,
  },
  abertasValor: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: cores.texto,
  },
  numeros: {
    flexDirection: "row",
    gap: 8,
  },
  numero: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: cores.fundo,
  },
  numeroValor: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: cores.texto,
  },
  numeroDestaque: {
    color: cores.erroForte,
  },
  numeroRotulo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    color: cores.textoSecundario,
  },
});
