"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ErrorFallback";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return <ErrorFallback error={error} resetErrorBoundary={reset} />;
}
