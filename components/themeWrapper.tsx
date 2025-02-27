import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import Navbar from "./navbar"
import GlobalFooter from "./globalFooter";
import { usePulsatingCircles } from "../context/PulsatingCirclesContext";
import { useState } from "react";
import PulsatingCircles from "./utils/pulse";

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    const { pulseState, setPulseState } = usePulsatingCircles();
    const [clickCount, setClickCount] = useState(0);

    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (event.target !== event.currentTarget) return;
    
        const newCount = clickCount + 1;
        if (newCount >= 5) {
            setPulseState(pulseState === "initial" ? "pulsing" : "initial");
            setClickCount(0);
        } else {
            setClickCount(newCount);
        }
    };

    return <div className='styled-scroll'>
        <div className="invisible light"></div>
        <main className="styled-scroll">
            <div className={`flex flex-col items-center min-h-screen overflow-hidden relative font-robo w-full`} onClick={handleClick}>
                <Toaster position="top-center" toastOptions={{
                    duration: 5000,
                    style: {
                        background: '#1b1b1b',
                        color: '#D9D9D9'
                    },
                    position: 'top-center',


                    error: {
                        duration: Infinity,
                    },
                }}
                >
                    {(t) => (
                        <ToastBar toast={t}>
                            {({ icon, message }) => (
                                <>
                                    {icon}
                                    {message}
                                    {t.type !== 'loading' && (
                                        <button type="button" onClick={() => toast.dismiss(t.id)}><X className="h-5" /></button>
                                    )}
                                </>
                            )}
                        </ToastBar>
                    )}
                </Toaster>
                <Navbar />
                <div className="w-full h-full max-w-lg z-[1] sm:mb-6">
                    <div className="flex h-full content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg">
                        <div className="flex h-full flex-col w-full text-primary-text">
                            <div className="relative w-full flex flex-col items-center">
                                <div className="absolute top-[460px] left-0 w-full flex items-center justify-center pointer-events-none">
                                    <PulsatingCircles />
                                </div>
                            </div>
                            <div className="z-20">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
                <div id="offset-for-stickyness" className="block md:hidden"></div>
                <GlobalFooter />
            </div>
        </main>
    </div>
}