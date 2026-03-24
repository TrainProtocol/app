import { Home } from "lucide-react"
import { useEffect } from "react"
import MessageComponent from "@/components/MessageComponent"
import Navbar from "@/components/navbar"
import GoHomeButton from "@/components/utils/GoHome"
import ContactSupport from "@/components/ContactSupport"
import posthog from "posthog-js"

export default function Custom404() {
    useEffect(() => {
        posthog.capture("404", {
            name: "404",
            path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
    }, []);

    return (
        <main className="styled-scroll max-sm:bg-secondary-700">
            <div className="min-h-screen overflow-hidden relative font-robo">
                <Navbar />
                <div className="mx-auto w-full max-w-[480px]">
                    <div className="bg-secondary-700 md:shadow-card rounded-3xl w-full overflow-hidden relative p-4 sm:h-[444px] max-sm:h-[90svh]">
                            <MessageComponent>
                                <MessageComponent.Content icon="red" center>
                                    <MessageComponent.Header>
                                        Page not found
                                    </MessageComponent.Header>
                                    <MessageComponent.Description>
                                        <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                            <span>We couldn&#39;t find a page with this link. If you believe there&#39;s an issue, please</span>
                                            <ContactSupport>
                                                <button
                                                    type="button"
                                                    className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none"
                                                >
                                                    contact our support
                                                </button>
                                            </ContactSupport>
                                            <span>and we&#39;ll help you fix it.</span>
                                        </p>
                                    </MessageComponent.Description>
                                </MessageComponent.Content>
                                <MessageComponent.Buttons>
                                    <GoHomeButton>
                                        <button
                                            type="button"
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-300 px-5 py-4 text-base font-semibold leading-6 text-primary-text hover:bg-secondary-400 focus:outline-none transition"
                                        >
                                            <Home className="h-5 w-5" aria-hidden="true" />
                                            <span>Back to app</span>
                                        </button>
                                    </GoHomeButton>
                                </MessageComponent.Buttons>
                            </MessageComponent>
                    </div>
                </div>
            </div>
        </main>
    )
}
