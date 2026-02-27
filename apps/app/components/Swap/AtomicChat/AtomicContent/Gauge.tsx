import { Check } from "lucide-react";

export const Gauge = ({
    value,
    size = "small",
    showCheckmark = false
}: {
    value: number;
    size: "verySmall" | "small" | "medium" | "large";
    showCheckmark?: boolean;
}) => {
    const circumference = 332; //2 * Math.PI * 53; // 2 * pi * radius
    const valueInCircumference = (value / 100) * circumference;
    const strokeDasharray = `${circumference} ${circumference}`;
    const initialOffset = circumference;
    const strokeDashoffset = initialOffset - valueInCircumference;

    const sizes = {
        verySmall: {
            width: "32",
            height: "32",
        },
        small: {
            width: "40",
            height: "40",
        },
        medium: {
            width: "72",
            height: "72",
        },
        large: {
            width: "144",
            height: "144",
        },
    };

    return (
        <div className="flex flex-col items-center justify-center relative">
            <svg
                fill="none"
                shapeRendering="crispEdges"
                height={sizes[size].height}
                width={sizes[size].width}
                viewBox="0 0 120 120"
                strokeWidth="2"
                className="transform -rotate-90"
            >
                <circle
                    className="text-accent/20"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    shapeRendering="geometricPrecision"
                    r="53"
                    cx="60"
                    cy="60"
                />
                <circle
                    className="text-accent animate-gauge_fill"
                    strokeWidth="12"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={initialOffset}
                    shapeRendering="geometricPrecision"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="53"
                    cx="60"
                    cy="60"
                    style={{
                        strokeDashoffset: strokeDashoffset,
                        transition: "stroke-dasharray 1s ease 0s,stroke 1s ease 0s",
                    }}
                />
            </svg>
            {showCheckmark && value === 100 ? (
                <div className="absolute flex animate-gauge_fadeIn">
                   <Check className="h-5 w-5 text-accent" strokeWidth={4} aria-hidden="true" />
                </div>
            ) : null}
        </div>
    );
};
