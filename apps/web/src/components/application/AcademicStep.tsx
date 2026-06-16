"use client";

import { ApplicationData } from "@ambo/database/application-types";
import { Input } from "@/components/ui/input";
import { TranscriptUpload } from "./TranscriptUpload";

interface AcademicStepProps {
    data: ApplicationData;
    onChange: (field: keyof ApplicationData, value: any) => void;
    uploading: boolean;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AcademicStep({ data, onChange, uploading, onFileUpload }: AcademicStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium">Current Cumulative GPA <span className="text-red-500">*</span></label>
                <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    className="max-w-[200px]"
                    value={data.gpa || ""}
                    onChange={(e) => onChange("gpa", parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Must be between 0.00 and 5.00</p>
            </div>
            <TranscriptUpload
                transcriptUrl={data.transcript_url}
                uploading={uploading}
                onFileUpload={onFileUpload}
                onRemove={() => onChange("transcript_url", "")}
            />
        </div>
    );
}
