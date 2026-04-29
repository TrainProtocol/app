"use client";

import { Home } from "lucide-react";
import { useEffect } from "react";
import posthog from "posthog-js";
import MessageComponent from "@/components/MessageComponent";
import GoHomeButton from "@/components/utils/GoHome";
import ContactSupport from "@/components/ContactSupport";
import NotFoundIcon from "@/components/Icons/NotFoundIcon";
import { Widget } from "@/components/Widget/Index";

export default function NotFound() {
    useEffect(() => {
        posthog.capture("404", {
            name: "404",
            path: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
    }, []);

    return (
        <Widget hideMenu>
            <div className="flex flex-col h-[80svh] sm:h-[400px]">
                <MessageComponent>
                    <MessageComponent.Content center>
                        <MessageComponent.Header className="mb-3">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-background">
                                <NotFoundIcon className="text-error-foreground" />
                            </div>
                            <h1 className="text-center text-2xl font-semibold text-primary-text">
                                Page not found
                            </h1>
                        </MessageComponent.Header>
                        <MessageComponent.Description>
                            <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                <span>We couldn&#39;t find a page with this link. If you believe there&#39;s an issue, please</span>
                                <ContactSupport>
                                    <button
                                        type="button"
                                        className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1420] focus:ring-gray-400 rounded"
                                    >
                                        <span>contact our support</span>
                                    </button>
                                </ContactSupport>
                                <span>and we&#39;ll help you fix it.</span>
                            </p>
                        </MessageComponent.Description>
                    </MessageComponent.Content>
                    <MessageComponent.Buttons>
                        <GoHomeButton>
                            <div className="flex w-full text-primary-text text-base space-x-2">
                                <button
                                    type="button"
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 px-5 py-4 text-base font-semibold leading-6 hover:bg-secondary-300 focus:outline-none transition"
                                >
                                    <Home className="h-5 w-5" aria-hidden="true" />
                                    <span>Back to app</span>
                                </button>
                            </div>
                        </GoHomeButton>
                    </MessageComponent.Buttons>
                </MessageComponent>
            </div>
        </Widget>
    );
}
