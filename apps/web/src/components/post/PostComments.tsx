"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Pencil, X, Check } from "lucide-react";
import { FormattedText } from "@/components/FormattedText";

type Comment = {
    id: string;
    content: string;
    created_at: string;
    user_id?: string;
    users: {
        first_name: string;
        last_name: string;
        role?: string;
        avatar_url?: string;
    };
};

export function PostComments({
    comments,
    loadingComments,
    canEditComment,
    editingCommentId,
    editCommentContent,
    setEditCommentContent,
    setEditingCommentId,
    deleteComment,
    saveCommentEdit,
    newComment,
    setNewComment,
    submitting,
    handlePostComment,
    getInitials,
}: {
    comments: Comment[];
    loadingComments: boolean;
    canEditComment: (comment: Comment) => boolean;
    editingCommentId: string | null;
    editCommentContent: string;
    setEditCommentContent: (value: string) => void;
    setEditingCommentId: (id: string | null) => void;
    deleteComment: (commentId: string) => void;
    saveCommentEdit: (commentId: string) => void;
    newComment: string;
    setNewComment: (value: string) => void;
    submitting: boolean;
    handlePostComment: () => void;
    getInitials: (firstName?: string, lastName?: string) => string;
}) {
    return (
        <div className="bg-muted/30 p-4 pt-2 border-t rounded-b-xl">
            {loadingComments ? (
                <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.length > 0 && (
                        <div className="space-y-4 mb-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 group">
                                    <Avatar className="h-6 w-6 mt-1">
                                        {comment.users?.avatar_url && <AvatarImage src={comment.users.avatar_url} alt={`${comment.users.first_name}'s avatar`} className="object-cover" />}
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {getInitials(comment.users?.first_name, comment.users?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-sm font-medium">
                                                {comment.users?.first_name} {comment.users?.last_name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                                {canEditComment(comment) && editingCommentId !== comment.id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }} className="text-muted-foreground hover:text-foreground">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => deleteComment(comment.id)} className="text-muted-foreground hover:text-red-500">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editCommentContent}
                                                    onChange={e => setEditCommentContent(e.target.value)}
                                                    className="h-7 text-sm"
                                                />
                                                <Button size="sm" onClick={() => saveCommentEdit(comment.id)} className="h-7 w-7 p-0">
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-7 w-7 p-0">
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                <FormattedText text={comment.content} />
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {comments.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2 text-center italic">
                            No comments yet. Start the conversation!
                        </p>
                    )}

                    <div className="flex gap-2 items-center">
                        <Avatar className="h-8 w-8 hidden sm:block">
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                Me
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="h-9"
                                onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                                enterKeyHint="send"
                                autoComplete="off"
                            />
                            <Button
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={handlePostComment}
                                disabled={!newComment.trim() || submitting}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
