export enum StepStatus {
    Upcoming = 'upcoming',
    Current = 'current',
    Complete = 'complete',
    Failed = 'failed',
}

export type TimelineStep = {
    name: string;
    status: StepStatus;
    description?: React.ReactNode;
    txLink?: string;
}
