import { create } from "zustand";

type PulsatingState = "initial" | "pulsing" | "completed";

interface PulsatingCirclesStore {
    pulseState: PulsatingState;
    setPulseState: (state: PulsatingState) => void;
}

export const usePulsatingCircles = create<PulsatingCirclesStore>((set) => ({
    pulseState: "initial",
    setPulseState: (state) => set({ pulseState: state }),
}));
