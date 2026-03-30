import { X } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast"
import Navbar from "./navbar"
import GlobalFooter from "./globalFooter";
import AppSidebar from "./Sidebar/AppSidebar";
import { SidebarProvider } from "./shadcn/sidebar";

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <div className='styled-scroll'>
        <div className="invisible light"></div>
        <SidebarProvider defaultOpen={false} className="styled-scroll flex min-h-screen w-full overflow-x-hidden">
                <div className={`flex-1 flex flex-col items-center min-h-screen overflow-hidden relative font-robo`}>
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
                        <div className="flex h-full content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-4 max-w-lg">
                            <div className="flex h-full flex-col w-full text-primary-text">
                                <div className="z-20">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="offset-for-stickyness" className="block md:hidden"></div>
                    <GlobalFooter />
                </div>
                <AppSidebar />
        </SidebarProvider>
    </div>
}
