import { create } from "zustand";

export const useVisitaEmAndamentoStore = create((set) => ({
  visitaId: null,
  localizacao: null,
  respostas: {},
  observacoesLivres: "",
  assinaturasColetadas: [],

  iniciarVisitaStore: (visitaId, localizacao = null) =>
    set((state) => ({
      visitaId,
      localizacao,
      respostas: state.visitaId === visitaId ? state.respostas : {},
      observacoesLivres: state.visitaId === visitaId ? state.observacoesLivres : "",
      assinaturasColetadas:
        state.visitaId === visitaId ? state.assinaturasColetadas : [],
    })),

  definirResposta: (perguntaId, resposta) =>
    set((state) => ({
      respostas: {
        ...state.respostas,
        [perguntaId]: resposta,
      },
    })),

  definirObservacoesLivres: (texto) =>
    set({
      observacoesLivres: texto,
    }),

  adicionarAssinatura: (assinatura) =>
    set((state) => ({
      assinaturasColetadas: [...state.assinaturasColetadas, assinatura],
    })),

  limparVisitaEmAndamento: () =>
    set({
      visitaId: null,
      localizacao: null,
      respostas: {},
      observacoesLivres: "",
      assinaturasColetadas: [],
    }),
}));

export default useVisitaEmAndamentoStore;