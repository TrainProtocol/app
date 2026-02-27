import TimelineStep from "./TimelineStep";
import { TimelineStep as TimelineStepType } from "./progressTypes";

export default function Timeline({ steps }: { steps: TimelineStepType[] }) {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
                {steps.map((step, index) => (
                    <TimelineStep
                        key={index}
                        step={step}
                        isLastStep={index === steps.length - 1}
                    />
                ))}
            </ol>
        </nav>
    );
}
