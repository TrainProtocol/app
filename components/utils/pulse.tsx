import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();

    return (
        <div className="absolute inset-0 hidden md:flex items-center justify-center">
            {isActive && (
                <>
                    <div
                        className="absolute w-[155%] aspect-square border border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "0s", clipPath: "inset(0 0 70% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[175%] aspect-square border border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "0.6s", clipPath: "inset(0 0 60% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[195%] aspect-square border-2 border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "1.2s", clipPath: "inset(0 0 55% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[215%] aspect-square border-4 border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "1.8s", clipPath: "inset(0 0 50% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[235%] aspect-square border-[6px] border-primary-text-placeholder rounded-full animate-pulsate"
                        style={{ animationDelay: "2.4s", clipPath: "inset(0 0 45% 0)" }}
                    ></div>
                </>
            )}
            {!isActive && (
                <>
                    <div
                        className="absolute w-[155%] aspect-square border border-primary-text-placeholder rounded-full opacity-25"
                        style={{ animationDelay: "0s", clipPath: "inset(0 0 70% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[175%] aspect-square border border-primary-text-placeholder rounded-full opacity-25"
                        style={{ animationDelay: "0.6s", clipPath: "inset(0 0 60% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[195%] aspect-square border-2 border-primary-text-placeholder rounded-full opacity-25"
                        style={{ animationDelay: "1.2s", clipPath: "inset(0 0 55% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[215%] aspect-square border-4 border-primary-text-placeholder rounded-full opacity-25"
                        style={{ animationDelay: "1.8s", clipPath: "inset(0 0 50% 0)" }}
                    ></div>
                    <div
                        className="absolute w-[235%] aspect-square border-[6px] border-primary-text-placeholder rounded-full opacity-25"
                        style={{ animationDelay: "2.4s", clipPath: "inset(0 0 45% 0)" }}
                    ></div>
                </>
            )}
        </div>
    );
};

export default PulsatingCircles;