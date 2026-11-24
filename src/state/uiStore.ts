import { create } from "zustand";

type UiState = {
  notice: string;
  showNotice: (notice: string) => void;
  clearNotice: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  notice: "",
  showNotice: (notice) => set({ notice }),
  clearNotice: () => set({ notice: "" }),
}));
