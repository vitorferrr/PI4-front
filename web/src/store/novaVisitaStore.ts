import { create } from 'zustand';

interface NovaVisitaState {
  fiscalizadoresSelecionados: number[];
  toggleFiscalizador: (id: number) => void;
  limparSelecao: () => void;
}

export const useNovaVisitaStore = create<NovaVisitaState>((set) => ({
  fiscalizadoresSelecionados: [],

  // A visita tem um único fiscal: selecionar outro substitui o anterior.
  toggleFiscalizador: (id) => set({ fiscalizadoresSelecionados: [id] }),

  limparSelecao: () => set({ fiscalizadoresSelecionados: [] }),
}));
