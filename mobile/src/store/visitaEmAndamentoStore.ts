import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordenadas } from "../types/visita";

export type TipoAssinante = "fiscalizador" | "denunciado";

export interface AssinaturaColetada {
  tipo: TipoAssinante;
  nome: string;
  imagem: string | null;
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
  limparVisitaStore: () => void;
}

type EstadoSalvo = Pick<
  VisitaEmAndamentoState,
  "visitaId" | "localizacao" | "respostas" | "observacoesLivres" | "assinaturasColetadas"
>;

export const useVisitaEmAndamentoStore = create<VisitaEmAndamentoState>()(
  persist(
    (set) => ({
      visitaId: null,
      localizacao: null,
      respostas: {},
      observacoesLivres: "",
      assinaturasColetadas: [],

      iniciarVisitaStore: (visitaId, localizacao = null) =>
        set((state) => {
          if (state.visitaId === visitaId) {
            return {
              localizacao: localizacao ?? state.localizacao,
            };
          }
          return {
            visitaId,
            localizacao,
            respostas: {},
            observacoesLivres: "",
            assinaturasColetadas: [],
          };
        }),

      definirResposta: (perguntaId, valor) =>
        set((state) => ({
          respostas: {
            ...state.respostas,
            [perguntaId]: valor,
          },
        })),

      definirObservacoesLivres: (texto) => set({ observacoesLivres: texto }),

      registrarAssinatura: (assinatura) =>
        set((state) => ({
          assinaturasColetadas: [
            ...state.assinaturasColetadas.filter((a) => a.tipo !== assinatura.tipo),
            assinatura,
          ],
        })),

      removerAssinatura: (tipo) =>
        set((state) => ({
          assinaturasColetadas: state.assinaturasColetadas.filter((a) => a.tipo !== tipo),
        })),

      limparVisitaStore: () =>
        set({
          visitaId: null,
          localizacao: null,
          respostas: {},
          observacoesLivres: "",
          assinaturasColetadas: [],
        }),
    }),
    {
      name: "visita-em-andamento-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (estadoSalvo, versaoSalva) => {
        const estado = { ...(estadoSalvo as EstadoSalvo) };
        if (versaoSalva < 1) estado.respostas = {};
        if (versaoSalva < 2) estado.assinaturasColetadas = [];
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
