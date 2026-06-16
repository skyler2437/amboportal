"use client";

import { ApplicationData } from "@ambo/database/application-types";
import { Input } from "@/components/ui/input";

interface ContactStepProps {
    data: ApplicationData;
    onChange: (field: keyof ApplicationData, value: any) => void;
}

export function ContactStep({ data, onChange }: ContactStepProps) {
    return (
        <div className="space-y-6 max-w-md mx-auto py-8">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Welcome</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your phone number to start or resume your application.
                </p>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cell Phone Number</label>
                <Input
                    type="tel"
                    className="text-lg tracking-wide text-center h-12"
                    placeholder="(555) 555-5555"
                    value={data.phone_number}
                    onChange={(e) => onChange("phone_number", e.target.value)}
                />
            </div>
        </div>
    );
}
