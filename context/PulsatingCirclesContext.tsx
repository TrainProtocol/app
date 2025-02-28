import React, { createContext, useState, useContext, ReactNode } from "react";

type PulsatingState = "initial" | "pulsing" | "completed";

interface PulsatingCirclesContextProps {
    pulseState: PulsatingState;
    setPulseState: (state: PulsatingState) => void;
}

const PulsatingCirclesContext = createContext<PulsatingCirclesContextProps | undefined>(undefined);

interface PulsatingCirclesProviderProps {
    children: ReactNode;
}

export const PulsatingCirclesProvider = ({ children }: PulsatingCirclesProviderProps) => {
    const [pulseState, setPulseState] = useState<PulsatingState>("initial");

    return (
        <PulsatingCirclesContext.Provider value={{ pulseState, setPulseState }}>
            {children}
        </PulsatingCirclesContext.Provider>
    );
};

export const usePulsatingCircles = () => {
    const context = useContext(PulsatingCirclesContext);
    if (!context) {
        throw new Error("usePulsatingCircles must be used within a PulsatingCirclesProvider");
    }
    return context;
};