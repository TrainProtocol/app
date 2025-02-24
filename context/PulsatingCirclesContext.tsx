import React, { createContext, useState, useContext, ReactNode } from "react";

interface PulsatingCirclesContextProps {
    isActive: boolean;
    setIsActive: (active: boolean) => void;
}

const PulsatingCirclesContext = createContext<PulsatingCirclesContextProps | undefined>(undefined);

interface PulsatingCirclesProviderProps {
    children: ReactNode;
}

export const PulsatingCirclesProvider = ({ children }: PulsatingCirclesProviderProps) => {
    const [isActive, setIsActive] = useState(true);

    return (
        <PulsatingCirclesContext.Provider value={{ isActive, setIsActive }}>
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