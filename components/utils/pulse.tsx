import React from "react";

interface PulsatingCirclesProps {
    isActive: boolean;
}

const PulsatingCircles: React.FC<PulsatingCirclesProps> = ({ isActive }) => {
    return (
        <div className="absolute inset-0 top-[45%] flex items-center justify-center">
            {isActive && (
                <>
                    <div className="absolute w-[50%] aspect-square border border-secondary-200 rounded-full animate-pulsate" 
                         style={{ animationDelay: "0s", clipPath: "inset(0 0 50% 0)" }}></div>
                    <div className="absolute w-[60%] aspect-square border border-secondary-200 rounded-full animate-pulsate" 
                         style={{ animationDelay: "0.6s", clipPath: "inset(0 0 50% 0)" }}></div>
                    <div className="absolute w-[70%] aspect-square border-2 border-secondary-200 rounded-full animate-pulsate" 
                         style={{ animationDelay: "1.2s", clipPath: "inset(0 0 50% 0)" }}></div>
                    <div className="absolute w-[80%] aspect-square border-4 border-secondary-200 rounded-full animate-pulsate" 
                         style={{ animationDelay: "1.8s", clipPath: "inset(0 0 50% 0)" }}></div>
                    <div className="absolute w-[90%] aspect-square border-[6px] border-secondary-200 rounded-full animate-pulsate" 
                         style={{ animationDelay: "2.4s", clipPath: "inset(0 0 50% 0)" }}></div>
                </>
            )}
        </div>
    );
};

export default PulsatingCircles;
