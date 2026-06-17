"use client";

import { ApplicationData } from "@ambo/database/application-types";
import { Input } from "@/components/ui/input";

interface ReferencesStepProps {
    data: ApplicationData;
    onChange: (field: keyof ApplicationData, value: any) => void;
}

export function ReferencesStep({ data, onChange }: ReferencesStepProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                    Academic Reference
                    <span className="text-xs font-normal text-muted-foreground ml-auto">Required</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Teacher Name <span className="text-red-500">*</span></label>
                        <Input value={data.referrer_academic_name || ""} onChange={(e) => onChange("referrer_academic_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Teacher Email <span className="text-red-500">*</span></label>
                        <Input type="email" value={data.referrer_academic_email || ""} onChange={(e) => onChange("referrer_academic_email", e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                    Spiritual Reference
                    <span className="text-xs font-normal text-muted-foreground ml-auto">Required</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Pastor/Teacher Name <span className="text-red-500">*</span></label>
                        <Input value={data.referrer_bible_name || ""} onChange={(e) => onChange("referrer_bible_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Pastor/Teacher Email <span className="text-red-500">*</span></label>
                        <Input type="email" value={data.referrer_bible_email || ""} onChange={(e) => onChange("referrer_bible_email", e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
