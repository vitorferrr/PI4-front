import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Coordenadas } from "../types/visita";

export interface AssinaturaColetada {
  nome?: string;
  uri: string;
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
  adicionarAssinatura: (assinatura: AssinaturaColetada) => void;
  limparVisitaStore: () => void;
}

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

      adicionarAssinatura: (assinatura) =>
        set((state) => ({
          assinaturasColetadas: [...state.assinaturasColetadas, assinatura],
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
