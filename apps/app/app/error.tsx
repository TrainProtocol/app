"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/ErrorFallback";
import { captureException } from "@/lib/faro";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
        captureException(error, { train_exception_type: "Global Error" });
    }, [error]);

    return <ErrorFallback error={error} resetErrorBoundary={reset} />;
}
