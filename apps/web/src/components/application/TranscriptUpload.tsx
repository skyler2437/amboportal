"use client";

import { Loader2, Upload, FileText } from "lucide-react";

interface TranscriptUploadProps {
    transcriptUrl?: string;
    uploading: boolean;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
}

export function TranscriptUpload({ transcriptUrl, uploading, onFileUpload, onRemove }: TranscriptUploadProps) {
    return (
        <div className="space-y-4 pt-4 border-t">
            <label className="text-sm font-medium block">Current Unofficial Transcript <span className="text-red-500">*</span></label>
            {transcriptUrl ? (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-md border">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm flex-1 truncate font-medium">Transcript Uploaded</span>
                    <button
                        onClick={onRemove}
                        className="text-xs text-destructive hover:underline font-medium"
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors w-fit border shadow-sm">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Upload File</span>
                        <input type="file" className="hidden" accept=".pdf,application/pdf" onChange={onFileUpload} />
                    </label>
                    <span className="text-xs text-muted-foreground">PDF (Max 5MB)</span>
                </div>
            )}
        </div>
    );
}
