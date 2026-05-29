"use client";

import { useRef, useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Shirt, Send, Loader2, Pencil, Trash2, X, Check, Paperclip, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer";
import { Plus } from "lucide-react";
import type { EventDetails, EventComment, EventRSVP, EventRSVPOption, UserRole } from "@ambo/database/types";

export function EventModal({
    event,
    onClose,
    currentUserId,
    userRole,
    onEventChanged,
}: {
    event: EventDetails;
    onClose: () => void;
    currentUserId: string;
    userRole: UserRole;
    onEventChanged?: () => void;
}) {
    // Data State
    const [comments, setComments] = useState<EventComment[]>([]);
    const [rsvps, setRsvps] = useState<EventRSVP[]>([]);
    const [rsvpOptions, setRsvpOptions] = useState<EventRSVPOption[]>([]);
    const [editRsvpOptions, setEditRsvpOptions] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Array<{ id: string; file_url: string; file_name: string; file_type: string; file_size: number }>>([]);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    // Permission Logic
    const isSuperAdmin = userRole === "superadmin";
    const isAdmin = userRole === "admin";

    // Event Permission:
    // Superadmin: All.
    // Admin: Can edit own events? Can edit other admin events?
    // Rule: "Admin ... can delete ... any student user and their own, but not other admin users."
    // Does this apply to events? "An Admin user should be able to delete or edit a post, event, comment... of any student user and their own, but not other admin users."
    // Events usually created by admins.
    // So if Event A created by Admin A. Admin B cannot edit/delete it.

    const eventCreatorRole = event.users?.role || "admin"; // Default to admin for events if unknown, as usually admins create them.
    const isMyEvent = event.created_by === currentUserId;

    // Admin can edit if: it's mine OR creator is student (unlikely for events) OR I am superadmin.
    // If creator is another admin, I cannot edit.

    const canEditEvent = isSuperAdmin || isMyEvent || (isAdmin && eventCreatorRole === "student");

    // Comment Permission:
    const canEditComment = (comment: EventComment) => {
        const isMyComment = comment.user_id === currentUserId;
        const commentOwnerRole = comment.users?.role || "student";
        return isSuperAdmin || isMyComment || (isAdmin && commentOwnerRole === "student");
    };


    // UI State
    const [newComment, setNewComment] = useState("");
    const [loadingComment, setLoadingComment] = useState(false);
    const [loadingRsvp, setLoadingRsvp] = useState(false);

    // Edit Event State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<EventDetails>>({});
    const [saving, setSaving] = useState(false);

    // Edit Comment State
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");


    const fetchData = async () => {
        try {
            const res = await fetch(`/api/events/comments?event_id=${event.id}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
                setRsvps(data.rsvps || []);
                setRsvpOptions(data.rsvp_options || []);
                setEditRsvpOptions((data.rsvp_options || []).map((o: EventRSVPOption) => o.label));
                setAttachments(data.attachments || []);
            }
        } catch (e) {
            console.error("Failed to fetch event data", e);
        }
    };

    const handleAttachmentUpload = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        setUploadingAttachment(true);
        try {
            const form = new FormData();
            Array.from(fileList).forEach((f) => form.append("files", f, f.name));
            const res = await fetch(`/api/events/${event.id}/attachments`, {
                method: "POST",
                body: form,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setAttachments((prev) => [...prev, ...(data.attachments || [])]);
                toast.success("Attachment uploaded");
            } else {
                toast.error(data.error || "Failed to upload attachment");
            }
        } catch {
            toast.error("Failed to upload attachment");
        }
        setUploadingAttachment(false);
        if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    };

    const deleteAttachment = async (attachmentId: string) => {
        const res = await fetch(`/api/events/${event.id}/attachments/${attachmentId}`, {
            method: "DELETE",
        });
        if (res.ok) {
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
            toast.success("Attachment removed");
        } else {
            toast.error("Failed to remove attachment");
        }
    };

    const isImageAttachment = (att: { file_type: string; file_name: string }) =>
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(att.file_type) ||
        /\.(jpe?g|png|gif|webp)$/i.test(att.file_name);

    const isDesktop = useMediaQuery("(min-width: 768px)");

    useEffect(() => {
        fetchData();
        setEditForm({
            title: event.title,
            description: event.description,
            uniform: event.uniform,
            start_time: event.start_time,
            end_time: event.end_time
        });
    }, [event.id]);

    // --- Comments Logic ---

    const postComment = async () => {
        if (!newComment.trim() || loadingComment) return;
        setLoadingComment(true);

        try {
            const res = await fetch("/api/events/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: event.id,
                    content: newComment.trim(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.comment) {
                    setComments((prev) => [...prev, data.comment]);
                } else if (Array.isArray(data.comments)) {
                    setComments(data.comments);
                }
                setNewComment("");
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to post comment");
            }
        } catch (e) {
            console.error("Failed to post comment", e);
            toast.error("Failed to post comment");
        }
        setLoadingComment(false);
    };

    const deleteComment = async (commentId: string) => {
        const res = await fetch(`/api/events/comments/${commentId}`, { method: "DELETE" });
        if (res.ok) {
            setComments(comments.filter(c => c.id !== commentId));
            toast.success("Comment deleted");
        } else {
            toast.error("Failed to delete comment");
        }
    };

    const startEditComment = (comment: EventComment) => {
        setEditingCommentId(comment.id);
        setEditCommentContent(comment.content);
    };

    const saveCommentEdit = async (commentId: string) => {
        const res = await fetch(`/api/events/comments/${commentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editCommentContent }),
        });
        if (res.ok) {
            const data = await res.json();
            setComments(comments.map(c => c.id === commentId ? { ...c, content: data.comment.content } : c));
            setEditingCommentId(null);
            toast.success("Comment updated");
        } else {
            toast.error("Failed to update comment");
        }
    };

    // --- RSVP Logic ---

    const handleRsvp = async (status: string, rsvpOptionId?: string) => {
        if (loadingRsvp) return;
        setLoadingRsvp(true);

        try {
            const res = await fetch("/api/events/rsvp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: event.id,
                    status,
                    ...(rsvpOptionId && { rsvp_option_id: rsvpOptionId }),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setRsvps(data.rsvps || []);
            } else {
                toast.error("Failed to update RSVP");
            }
        } catch (e) {
            console.error("Failed to update RSVP", e);
            toast.error("Failed to update RSVP");
        }
        setLoadingRsvp(false);
    };

    // --- Event Logic ---

    const handleSaveEvent = async () => {
        setSaving(true);
        const res = await fetch(`/api/events/${event.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...editForm,
                rsvp_options: editRsvpOptions.filter(o => o.trim()),
            }),
        });

        if (res.ok) {
            const data = await res.json();
            if (data.gcal_sync && !data.gcal_sync.synced) {
                toast.error(`Event saved, but Google Calendar sync failed: ${data.gcal_sync.reason}`);
            } else {
                toast.success("Event updated");
            }
            setIsEditing(false);
            onEventChanged?.();
            onClose();
        } else {
            toast.error("Failed to update event");
        }
        setSaving(false);
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteEvent = async () => {
        setDeleting(true);
        const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Event deleted");
            setShowDeleteConfirm(false);
            onEventChanged?.();
            onClose();
        } else {
            toast.error("Failed to delete event");
        }
        setDeleting(false);
    };

    // --- Utilities ---

    const formatTime = (d: string) =>
        new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

    const going = rsvps.filter((r) => r.status === "going");
    const maybe = rsvps.filter((r) => r.status === "maybe");
    const myRsvp = rsvps.find(r => r.user_id === currentUserId)?.status;

    const rsvpButtons = [
        {
            status: "going",
            label: "Going",
            activeClass: "bg-green-600 hover:bg-green-700",
        },
        {
            status: "maybe",
            label: "Maybe",
            activeClass: "bg-amber-500 text-white hover:bg-amber-600",
        },
        {
            status: "no",
            label: "Can't go",
            activeClass: "",
        },
    ];

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
    };

    const Content = (
        <div className={cn("flex flex-col h-full", isDesktop ? "max-h-[85vh]" : "max-h-[85vh]")}>
            <div className="p-6 pb-4 border-b">
                <div className="flex items-start justify-between gap-4">
                    {isEditing ? (
                        <div className="w-full space-y-3">
                            <Input
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                className="text-lg font-bold"
                                placeholder="Event Title"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="datetime-local"
                                    value={editForm.start_time ? new Date(editForm.start_time).toISOString().slice(0, 16) : ""}
                                    onChange={e => setEditForm({ ...editForm, start_time: new Date(e.target.value).toISOString() })}
                                />
                                <Input
                                    type="datetime-local"
                                    value={editForm.end_time ? new Date(editForm.end_time).toISOString().slice(0, 16) : ""}
                                    onChange={e => setEditForm({ ...editForm, end_time: new Date(e.target.value).toISOString() })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            {isDesktop ? (
                                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                            ) : (
                                <DrawerTitle className="text-xl text-left">{event.title}</DrawerTitle>
                            )}
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(event.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {canEditEvent && (
                        <div className="flex gap-1 shrink-0">
                            {isEditing ? (
                                <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveEvent} disabled={saving} aria-label="Save event">
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(false)} aria-label="Cancel editing">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)} aria-label="Edit event">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => setShowDeleteConfirm(true)} aria-label="Delete event">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-20">
                    {isEditing ? (
                        <Textarea
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description"
                            className="min-h-[100px]"
                        />
                    ) : (
                        event.description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {event.description}
                            </p>
                        )
                    )}

                    {/* Uniform */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                            <Shirt className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Uniform</h4>
                            {isEditing ? (
                                <Input
                                    value={editForm.uniform}
                                    onChange={e => setEditForm({ ...editForm, uniform: e.target.value })}
                                    className="h-8 text-sm"
                                    placeholder="Uniform Requirements"
                                />
                            ) : (
                                <p className="text-sm text-blue-900 dark:text-blue-100">{event.uniform || "Ambassador Polo with Navy Pants."}</p>
                            )}
                        </div>
                    </div>

                    {/* RSVP Section */}
                    <div className="space-y-4">
                        {isEditing ? (
                            <>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RSVP Options</h3>
                                <p className="text-xs text-muted-foreground">Add custom RSVP options (leave empty for default Going/Maybe/Can&apos;t go).</p>
                                <div className="space-y-2">
                                    {editRsvpOptions.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                value={opt}
                                                onChange={(e) => {
                                                    const updated = [...editRsvpOptions];
                                                    updated[idx] = e.target.value;
                                                    setEditRsvpOptions(updated);
                                                }}
                                                placeholder={`Option ${idx + 1}`}
                                                className="h-8 text-sm"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                                                onClick={() => setEditRsvpOptions(editRsvpOptions.filter((_, i) => i !== idx))}
                                                aria-label="Remove RSVP option"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {editRsvpOptions.length < 10 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => setEditRsvpOptions([...editRsvpOptions, ""])}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Option
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RSVP</h3>
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        {rsvpOptions.length > 0 ? (
                                            rsvpOptions.map((opt) => {
                                                const isSelected = myRsvp === "going" && rsvps.find(r => r.user_id === currentUserId)?.rsvp_option_id === opt.id;
                                                return (
                                                    <Button
                                                        key={opt.id}
                                                        variant={isSelected ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleRsvp("going", opt.id)}
                                                        disabled={loadingRsvp}
                                                        className={cn(
                                                            "h-8 transition-colors",
                                                            isSelected && "bg-green-600 hover:bg-green-700 border-green-600 text-white",
                                                            !isSelected && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </Button>
                                                );
                                            })
                                        ) : (
                                            rsvpButtons.map((btn) => (
                                                <Button
                                                    key={btn.status}
                                                    variant={myRsvp === btn.status ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleRsvp(btn.status)}
                                                    disabled={loadingRsvp}
                                                    className={cn(
                                                        "h-8 transition-colors",
                                                        myRsvp === btn.status && btn.status === "going" && "bg-green-600 hover:bg-green-700 border-green-600 text-white",
                                                        myRsvp === btn.status && btn.status === "maybe" && "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white",
                                                        myRsvp !== btn.status && "text-muted-foreground"
                                                    )}
                                                >
                                                    {btn.label}
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {rsvpOptions.length > 0 ? (
                                        <div className="text-sm space-y-1">
                                            {rsvpOptions.map((opt) => {
                                                const optRsvps = rsvps.filter(r => r.rsvp_option_id === opt.id);
                                                if (optRsvps.length === 0) return null;
                                                return (
                                                    <p key={opt.id}>
                                                        <span className="font-medium text-foreground">{opt.label} ({optRsvps.length}): </span>
                                                        <span className="text-muted-foreground">
                                                            {optRsvps.map((r) => `${r.users?.first_name || ""} ${r.users?.last_name || ""}`).map(n => n.trim()).filter(Boolean).join(", ")}
                                                        </span>
                                                    </p>
                                                );
                                            })}
                                            {rsvps.filter(r => r.rsvp_option_id === null || r.rsvp_option_id === undefined).length > 0 && rsvps.filter(r => !r.rsvp_option_id).some(r => r.status !== "no") && (
                                                <p>
                                                    <span className="font-medium text-foreground">Other: </span>
                                                    <span className="text-muted-foreground">
                                                        {rsvps.filter(r => !r.rsvp_option_id && r.status !== "no").map((r) => `${r.users?.first_name || ""} ${r.users?.last_name || ""}`).map(n => n.trim()).filter(Boolean).join(", ")}
                                                    </span>
                                                </p>
                                            )}
                                            {rsvps.length === 0 && (
                                                <p className="text-sm text-muted-foreground italic">No RSVPs yet.</p>
                                            )}
                                        </div>
                                    ) : (
                                        (going.length > 0 || maybe.length > 0) ? (
                                            <div className="text-sm space-y-1">
                                                {going.length > 0 && (
                                                    <p>
                                                        <span className="font-medium text-foreground">Going ({going.length}): </span>
                                                        <span className="text-muted-foreground">
                                                            {going.map((r) => `${r.users?.first_name || ""} ${r.users?.last_name || ""}`).map(n => n.trim()).filter(Boolean).join(", ")}
                                                        </span>
                                                    </p>
                                                )}
                                                {maybe.length > 0 && (
                                                    <p>
                                                        <span className="font-medium text-foreground">Maybe ({maybe.length}): </span>
                                                        <span className="text-muted-foreground">
                                                            {maybe.map((r) => `${r.users?.first_name || ""} ${r.users?.last_name || ""}`).map(n => n.trim()).filter(Boolean).join(", ")}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No RSVPs yet.</p>
                                        )
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <Separator />

                    {/* Attachments Section */}
                    {(attachments.length > 0 || canEditEvent) && (
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
                                            onChange={(e) => handleAttachmentUpload(e.target.files)}
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
                                                            onClick={() => deleteAttachment(att.id)}
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
                                                    onClick={() => deleteAttachment(att.id)}
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
                    )}

                    <Separator />

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Comments ({comments.length})
                        </h3>

                        <div className="space-y-4">
                            {comments.map((c) => (
                                <div key={c.id} className="flex gap-3 group">
                                    <Avatar className="h-8 w-8">
                                        {c.users?.avatar_url && <AvatarImage src={c.users.avatar_url} alt={`${c.users.first_name}'s avatar`} className="object-cover" />}
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                            {getInitials(c.users?.first_name, c.users?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm font-medium">
                                                {c.users?.first_name} {c.users?.last_name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(c.created_at).toLocaleDateString([], {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                                {(canEditComment(c)) && editingCommentId !== c.id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEditComment(c)} className="text-muted-foreground hover:text-foreground" aria-label="Edit comment">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-red-500" aria-label="Delete comment">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {editingCommentId === c.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editCommentContent}
                                                    onChange={e => setEditCommentContent(e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                                <Button size="sm" onClick={() => saveCommentEdit(c.id)} className="h-8 w-8 p-0" aria-label="Save comment">
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-8 w-8 p-0" aria-label="Cancel editing comment">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">{c.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">No comments yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Footer Input */}
            <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
                <div className="flex gap-2">
                    <Input
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postComment(); } }}
                        disabled={loadingComment}
                        enterKeyHint="send"
                        autoComplete="off"
                    />
                    <Button
                        size="icon"
                        onClick={postComment}
                        disabled={loadingComment || !newComment.trim()}
                        aria-label="Post comment"
                    >
                        {loadingComment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <>
                <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
                        {Content}
                    </DialogContent>
                </Dialog>
                <ConfirmDialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    title="Delete event"
                    description="This will permanently delete this event, including all RSVPs and comments. This action cannot be undone."
                    confirmLabel="Delete"
                    variant="destructive"
                    loading={deleting}
                    onConfirm={handleDeleteEvent}
                />
            </>
        );
    }

    return (
        <>
            <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
                <DrawerContent className="h-[95vh] rounded-t-[20px]">
                    {Content}
                </DrawerContent>
            </Drawer>
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete event"
                description="This will permanently delete this event, including all RSVPs and comments. This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                loading={deleting}
                onConfirm={handleDeleteEvent}
            />
        </>
    );
}
