import React from "react";
import { usePulsatingCircles } from "../../context/PulsatingCirclesContext";

const PulsatingCircles: React.FC = () => {
    const { isActive } = usePulsatingCircles();

    return (
        <>

            <svg id='rectangle' width="1732" height="890" viewBox="0 0 1732 890" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -top-40 z-[1]  h-auto text-secondary-950">
                <path d="M874.5 0.950492L1732 445L857.499 889.049L0.00024594 445L874.5 0.950492Z" fill="currentColor" />
            </svg>
            <div className="absolute inset-0 hidden md:flex items-center justify-center mx-4 isolate">

                {isActive && (
                    <>
                        {
                            <div className="absolute size-[1100px] rounded-full bg-secondary-950 animate-scaleLoop" />
                        }
                        <div
                            className="absolute w-[130%] aspect-square border border-secondary-text rounded-full mix-blend-color opacity-25"
                            style={{
                                animationDelay: "4s", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[150%] aspect-square border border-secondary-text rounded-full mix-blend-color opacity-25"
                            style={{
                                animationDelay: "3.2s", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[175%] aspect-square border-2 border-secondary-text rounded-full mix-blend-color opacity-25"
                            style={{
                                animationDelay: "2.4s", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[205%] aspect-square border-4 border-secondary-text rounded-full mix-blend-color opacity-25"
                            style={{
                                animationDelay: "1.6s", boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[245%] aspect-square border-[6px] border-secondary-text rounded-full mix-blend-color opacity-25"
                            style={{
                                animationDelay: "0.8s", boxShadow: `
                            rgba(184, 184, 184, 0.7) 6px -4px 14px -2px, rgba(184, 184, 184, 0.7) -5px 1px 12px 0px, rgba(184, 184, 184, 0.7) 6px 0px 11px 1px inset, rgba(184, 184, 184, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                    </>
                )}
                {
                    <>
                        <div
                            className="absolute w-[130%] aspect-square border border-secondary-text rounded-full opacity-25"
                            style={{
                                boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[150%] aspect-square border border-secondary-text rounded-full opacity-25"
                            style={{
                                boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[175%] aspect-square border-2 border-secondary-text rounded-full opacity-25"
                            style={{
                                boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[205%] aspect-square border-4 border-secondary-text rounded-full opacity-25"
                            style={{
                                boxShadow: `
                            rgba(128, 128, 128, 0.7) 6px -4px 14px -2px, rgba(128, 128, 128, 0.7) -5px 1px 12px 0px, rgba(128, 128, 128, 0.7) 6px 0px 11px 1px inset, rgba(128, 128, 128, 0.7) -6px 0px 11px 1px inset 
                        ` }}
                        ></div>
                        <div
                            className="absolute w-[245%] aspect-square border-[6px] border-secondary-text rounded-full opacity-25"
                            style={{
                                boxShadow: `
                            rgba(184, 184, 184, 0.7) 6px -4px 14px -2px, rgba(184, 184, 184, 0.7) -5px 1px 12px 0px, rgba(184, 184, 184, 0.7) 6px 0px 11px 1px inset, rgba(184, 184, 184, 0.7) -6px 0px 11px 1px inset 
                        `,
                            }}
                        ></div>
                    </>
                }
            </div>
        </>

    );
};

export default PulsatingCircles;
