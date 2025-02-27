import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const PulsatingCircles: React.FC = () => {
    const { pulseState } = usePulsatingCircles();

    const sharedBoxShadow = pulseState === 'completed' ? `
    rgba(39, 142, 246, 0.7) 6px -4px 14px -2px, 
    rgba(39, 142, 246, 0.7) -5px 1px 12px 0px, 
    rgba(39, 142, 246, 0.7) 6px 0px 11px 1px inset, 
    rgba(39, 142, 246, 0.7) -6px 0px 11px 1px inset
` : `
    rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, 
    rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, 
    rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, 
    rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset
`;

    const sharedBoxShadowLight = pulseState === 'completed' ? `
    rgba(39, 142, 246, 0.7) 6px -4px 14px -2px, 
    rgba(39, 142, 246, 0.7) -5px 1px 12px 0px, 
    rgba(39, 142, 246, 0.7) 6px 0px 11px 1px inset, 
    rgba(39, 142, 246, 0.7) -6px 0px 11px 1px inset
` : `
    rgba(184, 184, 184, 0.7) 6px -4px 14px -2px, 
    rgba(184, 184, 184, 0.7) -5px 1px 12px 0px, 
    rgba(184, 184, 184, 0.7) 6px 0px 11px 1px inset, 
    rgba(184, 184, 184, 0.7) -6px 0px 11px 1px inset
`;

    return (
        <>
            <svg id='rectangle' width="1732" height="890" viewBox="0 0 1732 890" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -top-32 z-[1]  h-auto text-secondary-950">
                <path d="M874.5 0.950492L1732 445L857.499 889.049L0.00024594 445L874.5 0.950492Z" fill="currentColor" />
            </svg>
            <div
                className={`absolute w-[130%] aspect-square border ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[rgb(128,128,128)]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle1" : ""}`}
                style={{ boxShadow: sharedBoxShadow }}
            ></div>

            <div
                className={`absolute w-[150%] aspect-square border ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[rgb(128,128,128)]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle2" : ""}`}
                style={{ boxShadow: sharedBoxShadow }}
            ></div>

            <div
                className={`absolute w-[175%] aspect-square border-2 ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[rgb(128,128,128)]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle3" : ""}`}
                style={{ boxShadow: sharedBoxShadow }}
            ></div>

            <div
                className={`absolute w-[205%] aspect-square border-4 ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[rgb(128,128,128)]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle4" : ""}`}
                style={{ boxShadow: sharedBoxShadowLight }}
            ></div>

            <div
                className={`absolute w-[245%] aspect-square border-[6px] ${pulseState === 'completed' ? "border-[#278EF6] opacity-50" : "opacity-10 border-[rgb(128,128,128)]"} rounded-full ${pulseState === 'pulsing' ? "animate-circle5" : ""}`}
                style={{ boxShadow: sharedBoxShadowLight }}
            ></div>
        </>
    );
};

export default PulsatingCircles;
