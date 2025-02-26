import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();

    return (
        <div className="absolute inset-0 hidden md:flex items-center justify-center mx-4">
            {isActive && (
                <>
                    <div
                        className="absolute w-[130%] aspect-square border border-secondary-text rounded-full animate-pulsate opacity-25"
                        style={{
                            animationDelay: "0s", clipPath: "inset(0 -8px 65% -8px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[150%] aspect-square border border-secondary-text rounded-full animate-pulsate opacity-25"
                        style={{
                            animationDelay: "0.6s", clipPath: "inset(0 -8px 58% -8px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[175%] aspect-square border-2 border-secondary-text rounded-full animate-pulsate opacity-25"
                        style={{
                            animationDelay: "1.2s", clipPath: "inset(0 -15px 53% -15px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[205%] aspect-square border-4 border-secondary-text rounded-full animate-pulsate opacity-25"
                        style={{
                            animationDelay: "1.8s", clipPath: "inset(0 -15px 48% -15px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[245%] aspect-square border-[6px] border-secondary-text rounded-full animate-pulsate opacity-25"
                        style={{
                            animationDelay: "2.4s", clipPath: "inset(0 -15px 45% -15px)", boxShadow: `
                            rgba(184, 184, 184, 0.7) 6px -4px 14px -2px, rgba(184, 184, 184, 0.7) -5px 1px 12px 0px, rgba(184, 184, 184, 0.7) 6px 0px 11px 1px inset, rgba(184, 184, 184, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                </>
            )}
            {!isActive && (
                <>
                    <div
                        className="absolute w-[130%] aspect-square border border-secondary-text rounded-full opacity-25"
                        style={{
                            animationDelay: "0s", clipPath: "inset(0 -8px 65% -8px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[150%] aspect-square border border-secondary-text rounded-full opacity-25"
                        style={{
                            animationDelay: "0.6s", clipPath: "inset(0 -8px 58% -8px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[175%] aspect-square border-2 border-secondary-text rounded-full opacity-25"
                        style={{
                            animationDelay: "1.2s", clipPath: "inset(0 -15px 53% -15px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[205%] aspect-square border-4 border-secondary-text rounded-full opacity-25"
                        style={{
                            animationDelay: "1.8s", clipPath: "inset(0 -15px 48% -15px)", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                    ></div>
                    <div
                        className="absolute w-[245%] aspect-square border-[6px] border-secondary-text rounded-full opacity-25"
                        style={{
                            animationDelay: "2.4s", clipPath: "inset(0 -15px 45% -15px)", boxShadow: `
                            rgba(184, 184, 184, 0.7) 6px -4px 14px -2px, rgba(184, 184, 184, 0.7) -5px 1px 12px 0px, rgba(184, 184, 184, 0.7) 6px 0px 11px 1px inset, rgba(184, 184, 184, 0.7) -6px 0px 11px 1px inset 
                        `,
                        }}
                    ></div>
                </>
            )}
        </div>
    );
};

export default PulsatingCircles;