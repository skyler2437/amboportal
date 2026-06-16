"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, X, Check, Loader2, Send } from "lucide-react";
import type { EventComment } from "@ambo/database/types";

export function EventCommentSection({
    comments,
    editingCommentId,
    editCommentContent,
    setEditCommentContent,
    canEditComment,
    onStartEdit,
    onDelete,
    onSaveEdit,
    onCancelEdit,
    getInitials,
}: {
    comments: EventComment[];
    editingCommentId: string | null;
    editCommentContent: string;
    setEditCommentContent: (content: string) => void;
    canEditComment: (comment: EventComment) => boolean;
    onStartEdit: (comment: EventComment) => void;
    onDelete: (commentId: string) => void;
    onSaveEdit: (commentId: string) => void;
    onCancelEdit: () => void;
    getInitials: (firstName?: string, lastName?: string) => string;
}) {
    return (
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
                                            <button onClick={() => onStartEdit(c)} className="text-muted-foreground hover:text-foreground" aria-label="Edit comment">
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => onDelete(c.id)} className="text-muted-foreground hover:text-red-500" aria-label="Delete comment">
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
                                    <Button size="sm" onClick={() => onSaveEdit(c.id)} className="h-8 w-8 p-0" aria-label="Save comment">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-8 w-8 p-0" aria-label="Cancel editing comment">
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
    );
}

export function EventCommentInput({
    newComment,
    setNewComment,
    loadingComment,
    onPost,
}: {
    newComment: string;
    setNewComment: (value: string) => void;
    loadingComment: boolean;
    onPost: () => void;
}) {
    return (
        <div className="flex gap-2">
            <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onPost(); } }}
                disabled={loadingComment}
                enterKeyHint="send"
                autoComplete="off"
            />
            <Button
                size="icon"
                onClick={onPost}
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
    );
}
