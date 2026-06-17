"use client";

import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, FileText, Download, Paperclip } from "lucide-react";

type Attachment = { id: string; file_url: string; file_name: string; file_type: string; file_size: number };

export function EventAttachmentsSection({
    attachments,
    canEditEvent,
    uploadingAttachment,
    attachmentInputRef,
    onUpload,
    onDelete,
    isImageAttachment,
}: {
    attachments: Attachment[];
    canEditEvent: boolean;
    uploadingAttachment: boolean;
    attachmentInputRef: RefObject<HTMLInputElement>;
    onUpload: (fileList: FileList | null) => void;
    onDelete: (attachmentId: string) => void;
    isImageAttachment: (att: { file_type: string; file_name: string }) => boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Attachments {attachments.length > 0 && `(${attachments.length})`}
                </h3>
                {canEditEvent && (
                    <>
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => onUpload(e.target.files)}
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => attachmentInputRef.current?.click()}
                            disabled={uploadingAttachment}
                        >
                            {uploadingAttachment ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                                <Paperclip className="h-3.5 w-3.5 mr-1" />
                            )}
                            {uploadingAttachment ? "Uploading…" : "Add"}
                        </Button>
                    </>
                )}
            </div>

            {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No attachments.</p>
            ) : (
                <div className="space-y-2">
                    {attachments.filter(isImageAttachment).length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {attachments.filter(isImageAttachment).map((att) => (
                                <div key={att.id} className="relative group">
                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={att.file_url}
                                            alt={att.file_name}
                                            className="rounded-md w-full h-32 object-cover border"
                                            loading="lazy"
                                        />
                                    </a>
                                    {canEditEvent && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(att.id)}
                                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label={`Remove ${att.file_name}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {attachments.filter((a) => !isImageAttachment(a)).map((att) => (
                        <div key={att.id} className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm group">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.file_name}
                                className="flex-1 truncate hover:underline"
                                title={att.file_name}
                            >
                                {att.file_name}
                            </a>
                            <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.file_name}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Download ${att.file_name}`}
                            >
                                <Download className="h-4 w-4" />
                            </a>
                            {canEditEvent && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(att.id)}
                                    className="text-muted-foreground hover:text-red-500"
                                    aria-label={`Remove ${att.file_name}`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
