"use client";

import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Attachment = {
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
};

export function PostAttachmentsView({
    imageAttachments,
    fileAttachments,
}: {
    imageAttachments: Attachment[];
    fileAttachments: Attachment[];
}) {
    return (
        <>
            {imageAttachments.length > 0 && (
                <div className={cn(
                    "mt-3 grid gap-2",
                    imageAttachments.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {imageAttachments.map((att) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="rounded-lg w-full max-h-80 object-cover border"
                                loading="lazy"
                            />
                        </a>
                    ))}
                </div>
            )}

            {fileAttachments.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {fileAttachments.map((att) => (
                        <a
                            key={att.id}
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.file_name}
                            className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors text-sm"
                        >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate" title={att.file_name}>{att.file_name}</span>
                            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                    ))}
                </div>
            )}
        </>
    );
}
