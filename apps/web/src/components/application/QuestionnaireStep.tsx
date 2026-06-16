"use client";

import { ApplicationData } from "@ambo/database/application-types";

interface QuestionnaireStepProps {
    data: ApplicationData;
    onChange: (field: keyof ApplicationData, value: any) => void;
}

export function QuestionnaireStep({ data, onChange }: QuestionnaireStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium">Please list your current or past involvement... <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_involvement || ""}
                    onChange={(e) => onChange("q_involvement", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Why do you want to be a Student Ambassador? <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_why_ambassador || ""}
                    onChange={(e) => onChange("q_why_ambassador", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Have you accepted Jesus Christ as your Lord and Savior? <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_faith || ""}
                    onChange={(e) => onChange("q_faith", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">What do you love most about Linfield? <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_love_linfield || ""}
                    onChange={(e) => onChange("q_love_linfield", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">What would you change about Linfield? <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_change_linfield || ""}
                    onChange={(e) => onChange("q_change_linfield", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Why did you/your family decide to attend Linfield? <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_family_decision || ""}
                    onChange={(e) => onChange("q_family_decision", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Personal Strengths <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_strengths || ""}
                    onChange={(e) => onChange("q_strengths", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Personal Weaknesses <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_weaknesses || ""}
                    onChange={(e) => onChange("q_weaknesses", e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Time Commitment (Monthly) <span className="text-red-500">*</span></label>
                <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={data.q_time_commitment || ""}
                    onChange={(e) => onChange("q_time_commitment", e.target.value)}
                />
            </div>
        </div>
    );
}
