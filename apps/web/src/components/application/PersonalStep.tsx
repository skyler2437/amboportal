"use client";

import { ApplicationData } from "@ambo/database/application-types";
import { Input } from "@/components/ui/input";

interface PersonalStepProps {
    data: ApplicationData;
    onChange: (field: keyof ApplicationData, value: any) => void;
    isAuthenticated: boolean;
}

export function PersonalStep({ data, onChange, isAuthenticated }: PersonalStepProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Guest flow: show name and email fields */}
                {!isAuthenticated && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name <span className="text-red-500">*</span></label>
                            <Input value={data.first_name || ""} onChange={(e) => onChange("first_name", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name <span className="text-red-500">*</span></label>
                            <Input value={data.last_name || ""} onChange={(e) => onChange("last_name", e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Student Email <span className="text-red-500">*</span></label>
                            <Input type="email" value={data.email || ""} onChange={(e) => onChange("email", e.target.value)} />
                        </div>
                    </>
                )}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Current Grade <span className="text-red-500">*</span></label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={data.grade_current || ""}
                        onChange={(e) => onChange("grade_current", e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="9">Freshman (9th)</option>
                        <option value="10">Sophomore (10th)</option>
                        <option value="11">Junior (11th)</option>
                        <option value="12">Senior (12th)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Grade Entered Linfield <span className="text-red-500">*</span></label>
                    <Input placeholder="e.g. 6th Grade" value={data.grade_entry || ""} onChange={(e) => onChange("grade_entry", e.target.value)} />
                </div>
            </div>
        </div>
    );
}
