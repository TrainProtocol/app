import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const circleConfigs = [
    { size: "130%", borderWidth: "border", clipPath: "inset(0 -8px 65% -8px)", delay: "0s" },
    { size: "150%", borderWidth: "border", clipPath: "inset(0 -8px 58% -8px)", delay: "0.6s" },
    { size: "175%", borderWidth: "border-2", clipPath: "inset(0 -15px 53% -15px)", delay: "1.2s" },
    { size: "205%", borderWidth: "border-4", clipPath: "inset(0 -15px 48% -15px)", delay: "1.8s" },
    { size: "245%", borderWidth: "border-[6px]", clipPath: "inset(0 -15px 45% -15px)", delay: "2.4s" },
];

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();

    return (
        <div className="absolute inset-0 hidden md:flex items-center justify-center mx-4">
            {circleConfigs.map(({ size, borderWidth, clipPath, delay }, index) => (
                <div
                    key={index}
                    className={`absolute w-[${size}] aspect-square ${borderWidth} border-secondary-text rounded-full opacity-25 
                        ${isActive ? "animate-pulsate" : ""}`}
                    style={{
                        animationDelay: isActive ? delay : "0s",
                        clipPath,
                        boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, 
                            rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, 
                            rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, 
                            rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset
                        `,
                    }}
                ></div>
            ))}
        </div>
    );
};

export default PulsatingCircles;
