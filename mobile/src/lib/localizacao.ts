import { Platform } from "react-native";
import * as Location from "expo-location";
import type { Coordenadas } from "@/types/visita";

const TIMEOUT_GPS_MS = 15000;
// posição antiga demais não serve como registro de onde a visita começou
const IDADE_MAXIMA_ULTIMA_POSICAO_MS = 5 * 60 * 1000;

export type MotivoFalhaGps =
  | "permissao_negada" // negou agora, ainda dá para pedir de novo
  | "permissao_bloqueada" // negou de vez: só pelas configurações do aparelho
  | "servico_desativado" // GPS / localização do aparelho desligado
  | "sem_sinal"; // permissão e serviço ok, mas não veio posição a tempo

export class ErroLocalizacao extends Error {
  motivo: MotivoFalhaGps;

  constructor(motivo: MotivoFalhaGps) {
    super(motivo);
    this.motivo = motivo;
  }
}

async function garantirPermissao() {
  const atual = await Location.getForegroundPermissionsAsync();
  if (atual.granted) return;
  if (!atual.canAskAgain) throw new ErroLocalizacao("permissao_bloqueada");

  const pedido = await Location.requestForegroundPermissionsAsync();
  if (pedido.granted) return;
  throw new ErroLocalizacao(pedido.canAskAgain ? "permissao_negada" : "permissao_bloqueada");
}

async function garantirServicoAtivo() {
  if (await Location.hasServicesEnabledAsync()) return;

  if (Platform.OS === "android") {
    // mostra o diálogo do sistema para ligar a localização; rejeita se o fiscal recusar
    await Location.enableNetworkProviderAsync().catch(() => {});
    if (await Location.hasServicesEnabledAsync()) return;
  }

  throw new ErroLocalizacao("servico_desativado");
}

async function lerPosicao() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), TIMEOUT_GPS_MS);
  });

  try {
    const atual = await Promise.race([
      // High usa o GPS: a coordenada vai para o documento como local de início da
      // visita, e o Balanced (rede/Wi-Fi) costuma errar em torno de 100 m
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeout,
    ]).catch(() => null);
    if (atual) return atual;

    return await Location.getLastKnownPositionAsync({
      maxAge: IDADE_MAXIMA_ULTIMA_POSICAO_MS,
    }).catch(() => null);
  } finally {
    clearTimeout(timer);
  }
}

export async function capturarLocalizacao(): Promise<Coordenadas> {
  await garantirPermissao();
  await garantirServicoAtivo();

  const posicao = await lerPosicao();
  if (!posicao) throw new ErroLocalizacao("sem_sinal");

  return { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
}
