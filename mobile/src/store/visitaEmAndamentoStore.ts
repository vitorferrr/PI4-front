import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordenadas } from "../types/visita";
import { apagarImagemAssinatura } from "../lib/arquivosAssinatura";

export type TipoAssinante = "fiscalizador" | "denunciado";

export interface AssinaturaColetada {
  tipo: TipoAssinante;
  nome: string;
  usuarioId: number | null;
  imagemUri: string | null;
  recusou: boolean;
  assinadoEm: string;
}

interface VisitaEmAndamentoState {
  visitaId: number | null;
  localizacao: Coordenadas | null;
  respostas: Record<number, string>;
  observacoesLivres: string;
  assinaturasColetadas: AssinaturaColetada[];
  iniciarVisitaStore: (visitaId: number, localizacao?: Coordenadas | null) => void;
  definirResposta: (perguntaId: number, valor: string) => void;
  definirObservacoesLivres: (texto: string) => void;
  registrarAssinatura: (assinatura: AssinaturaColetada) => void;
  removerAssinatura: (tipo: TipoAssinante) => void;
  descartarAssinaturas: () => void;
  limparVisitaStore: () => void;
}

type EstadoSalvo = Pick<
  VisitaEmAndamentoState,
  "visitaId" | "localizacao" | "respostas" | "observacoesLivres" | "assinaturasColetadas"
>;

function apagarArquivos(assinaturas: AssinaturaColetada[]) {
  assinaturas.forEach((a) => apagarImagemAssinatura(a.imagemUri));
}

export const useVisitaEmAndamentoStore = create<VisitaEmAndamentoState>()(
  persist(
    (set, get) => ({
      visitaId: null,
      localizacao: null,
      respostas: {},
      observacoesLivres: "",
      assinaturasColetadas: [],

      iniciarVisitaStore: (visitaId, localizacao = null) => {
        const state = get();
        if (state.visitaId === visitaId) {
          set({ localizacao: localizacao ?? state.localizacao });
          return;
        }
        apagarArquivos(state.assinaturasColetadas);
        set({
          visitaId,
          localizacao,
          respostas: {},
          observacoesLivres: "",
          assinaturasColetadas: [],
        });
      },

      definirResposta: (perguntaId, valor) => {
        const state = get();
        if (state.respostas[perguntaId] === valor) return;
        if (state.assinaturasColetadas.length > 0) get().descartarAssinaturas();
        set({ respostas: { ...state.respostas, [perguntaId]: valor } });
      },

      definirObservacoesLivres: (texto) => {
        const state = get();
        if (state.observacoesLivres === texto) return;
        if (state.assinaturasColetadas.length > 0) get().descartarAssinaturas();
        set({ observacoesLivres: texto });
      },

      registrarAssinatura: (assinatura) => {
        const state = get();
        apagarArquivos(state.assinaturasColetadas.filter((a) => a.tipo === assinatura.tipo));
        set({
          assinaturasColetadas: [
            ...state.assinaturasColetadas.filter((a) => a.tipo !== assinatura.tipo),
            assinatura,
          ],
        });
      },

      removerAssinatura: (tipo) => {
        const state = get();
        apagarArquivos(state.assinaturasColetadas.filter((a) => a.tipo === tipo));
        set({
          assinaturasColetadas: state.assinaturasColetadas.filter((a) => a.tipo !== tipo),
        });
      },

      descartarAssinaturas: () => {
        apagarArquivos(get().assinaturasColetadas);
        set({ assinaturasColetadas: [] });
      },

      limparVisitaStore: () => {
        apagarArquivos(get().assinaturasColetadas);
        set({
          visitaId: null,
          localizacao: null,
          respostas: {},
          observacoesLivres: "",
          assinaturasColetadas: [],
        });
      },
    }),
    {
      name: "visita-em-andamento-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (estadoSalvo, versaoSalva) => {
        const estado = { ...(estadoSalvo as EstadoSalvo) };
        if (versaoSalva < 1) estado.respostas = {};
        if (versaoSalva < 3) estado.assinaturasColetadas = [];
        return estado;
      },
      partialize: (state) => ({
        visitaId: state.visitaId,
        localizacao: state.localizacao,
        respostas: state.respostas,
        observacoesLivres: state.observacoesLivres,
        assinaturasColetadas: state.assinaturasColetadas,
      }),
    }
  )
);
