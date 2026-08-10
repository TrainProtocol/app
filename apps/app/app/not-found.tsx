"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/faro";
import NotFoundIcon from "@/components/Icons/NotFoundIcon";
import StatusPage, { BackToAppButton, SupportLink } from "@/components/StatusPage";

export default function NotFound() {
    useEffect(() => {
        captureEvent("404", {
            path: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
    }, []);

    return (
        <StatusPage
            tone="error"
            icon={<NotFoundIcon className="text-error-foreground" />}
            title="Page not found"
            description={
                <>
                    <span>We couldn&#39;t find a page with this link. If you believe there&#39;s an issue, please</span>
                    <SupportLink>contact our support</SupportLink>
                    <span>and we&#39;ll help you fix it.</span>
                </>
            }
        >
            <BackToAppButton />
        </StatusPage>
    );
}
