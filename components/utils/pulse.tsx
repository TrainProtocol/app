import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();

    return (
        <div className="absolute inset-0 xl:top-[130%] lg:top-[60%] hidden md:flex items-center justify-center">
            {isActive && (
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
            {!isActive && (
                <>
                    <div
                        className="absolute w-[80%] aspect-square border border-primary-text-placeholder rounded-full"
                        style={{ animationDelay: "0s" }}
                    ></div>
                    <div
                        className="absolute w-[90%] aspect-square border border-primary-text-placeholder rounded-full"
                        style={{ animationDelay: "0.6s" }}
                    ></div>
                    <div
                        className="absolute w-[100%] aspect-square border-2 border-primary-text-placeholder rounded-full"
                        style={{ animationDelay: "1.2s" }}
                    ></div>
                    <div
                        className="absolute w-[110%] aspect-square border-4 border-primary-text-placeholder rounded-full"
                        style={{ animationDelay: "1.8s" }}
                    ></div>
                    <div
                        className="absolute w-[120%] aspect-square border-[6px] border-primary-text-placeholder rounded-full"
                        style={{ animationDelay: "2.4s" }}
                    ></div>
                </>
            )}
        </div>
    );
};

export default PulsatingCircles;