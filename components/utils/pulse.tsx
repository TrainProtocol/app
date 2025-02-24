import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";
import useWindowDimensions from "../../hooks/useWindowDimensions";

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();
    const { isDesktop } = useWindowDimensions()

    return (
        <div className="absolute inset-0 top-[110%] flex items-center justify-center">
            {isActive && isDesktop && (
                <>
                    <div
                        className="absolute w-[80%] aspect-square border border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "0s" }}
                    ></div>
                    <div
                        className="absolute w-[90%] aspect-square border border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "0.6s" }}
                    ></div>
                    <div
                        className="absolute w-[100%] aspect-square border-2 border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "1.2s" }}
                    ></div>
                    <div
                        className="absolute w-[110%] aspect-square border-4 border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "1.8s" }}
                    ></div>
                    <div
                        className="absolute w-[120%] aspect-square border-[6px] border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "2.4s" }}
                    ></div>
                </>
            )}
        </div>
    );
};

export default PulsatingCircles;