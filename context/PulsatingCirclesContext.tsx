import React, { createContext, useState, useContext, ReactNode } from "react";

interface PulsatingCirclesContextProps {
    isActive: boolean;
    setIsActive: (value: boolean) => void;
}

const PulsatingCirclesContext = createContext<PulsatingCirclesContextProps | undefined>(undefined);

export const usePulsatingCircles = () => {
    const context = useContext(PulsatingCirclesContext);
    if (!context) {
        throw new Error("usePulsatingCircles must be used within a PulsatingCirclesProvider");
    }
    return context;
};

export const PulsatingCirclesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);

    return (
        <PulsatingCirclesContext.Provider value={{ isActive, setIsActive }}>
            {children}
        </PulsatingCirclesContext.Provider>
    );
};