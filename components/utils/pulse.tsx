import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext"

const PulsatingCircles: React.FC = () => {
    const { pulseState } = usePulsatingCircles()

    return (
        <>
            <svg id='rectangle' width="1732" height="890" viewBox="0 0 1732 890" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -top-40 z-[1] h-auto text-secondary-950">
                <path d="M874.5 0.950492L1732 445L857.499 889.049L0.00024594 445L874.5 0.950492Z" fill="currentColor" />
            </svg>
            <div
                className={`absolute w-[130%] aspect-square border ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[#808080]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle1" : ""}`}
                style={{
                    filter: pulseState === 'completed' ? "drop-shadow(0px -2px 4px rgba(39, 142, 246, 0.8))" : "drop-shadow(0px -2px 4px rgba(255, 255, 255, 0.5))"
                }}
            ></div>

            <div
                className={`absolute w-[150%] aspect-square border ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[#808080]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle2" : ""}`}
                style={{ filter: pulseState === 'completed' ? "drop-shadow(0px -2px 7px rgba(39, 142, 246, 0.8))" : "drop-shadow(0px -2px 6px rgba(255, 255, 255, 0.6))" }}
            ></div>

            <div
                className={`absolute w-[175%] aspect-square border-2 ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[#808080]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle3" : ""}`}
                style={{
                    filter: pulseState === 'completed' ? "drop-shadow(0px -2px 5px rgba(39, 142, 246, 0.8))" : "drop-shadow(0px -2px 8px rgba(255, 255, 255, 0.7))"
                }}
            ></div>

            <div
                className={`absolute w-[205%] aspect-square border-[3px] ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[#808080]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle4" : ""}`}
                style={{
                    filter: pulseState === 'completed' ? "drop-shadow(0px -2px 10px rgba(39, 142, 246, 0.8))" : "drop-shadow(0px -2px 10px rgba(255, 255, 255, 0.8))"
                }}
            ></div>

            <div
                className={`absolute w-[245%] aspect-square border-4 ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[#B8B8B8]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle5" : ""}`}
                style={{
                    filter: pulseState === 'completed' ? "drop-shadow(0px -2px 12px rgba(39, 142, 246, 0.8))" : "drop-shadow(0px -2px 12px rgba(255, 255, 255, 0.9))"
                }}
            ></div>
        </>
    );
};

export default PulsatingCircles;
