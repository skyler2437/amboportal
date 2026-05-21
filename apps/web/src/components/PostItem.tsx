"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/ui/motion-button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    MessageSquare,
    Send,
    Loader2,
    Pencil,
    Trash2,
    X,
    Check,
    Heart,
    Eye,
    Download,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormattedText } from "@/components/FormattedText";
import { cn } from "@/lib/utils";

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

type Attachment = {
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
};

type Post = {
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
    comments: { count: number }[];
    like_count?: number;
    view_count?: number;
    has_liked?: boolean;
    attachments?: Attachment[];
};

type LikeRow = {
    user_id: string;
    created_at: string;
    users: {
        id: string;
        first_name: string;
        last_name: string;
        avatar_url?: string;
    };
};

type ViewRow = {
    user_id: string;
    viewed_at: string;
    users: {
        id: string;
        first_name: string;
        last_name: string;
        avatar_url?: string;
    };
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isImage(att: Attachment) {
    return IMAGE_TYPES.includes(att.file_type) ||
        /\.(jpe?g|png|gif|webp)$/i.test(att.file_name);
}

export function PostItem({ post, currentUserId, currentUserRole }: { post: Post; currentUserId: string; currentUserRole: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [showComments, setShowComments] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isDeleted, setIsDeleted] = useState(false);

    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [commentCount, setCommentCount] = useState(post.comments?.[0]?.count || 0);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentContent, setEditCommentContent] = useState("");

    // Likes
    const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
    const [hasLiked, setHasLiked] = useState(post.has_liked ?? false);
    const [likeBusy, setLikeBusy] = useState(false);
    const [likesDialogOpen, setLikesDialogOpen] = useState(false);
    const [likesList, setLikesList] = useState<LikeRow[] | null>(null);

    // Views
    const [viewCount] = useState(post.view_count ?? 0);
    const [viewsDialogOpen, setViewsDialogOpen] = useState(false);
    const [viewsList, setViewsList] = useState<ViewRow[] | null>(null);

    const isMyPost = currentUserId === post.user_id;
    const isSuperAdmin = currentUserRole === "superadmin";
    const isAdmin = currentUserRole === "admin";
    const postOwnerRole = post.users.role || "student";
    const canEditPost = isMyPost || isSuperAdmin || (isAdmin && postOwnerRole === "student");

    const canEditComment = (comment: Comment) => {
        const isMyComment = currentUserId === comment.user_id;
        const commentOwnerRole = comment.users.role || "student";
        return isMyComment || isSuperAdmin || (isAdmin && commentOwnerRole === "student");
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingPost, setDeletingPost] = useState(false);

    if (isDeleted) return null;

    const handleDeletePost = async () => {
        setDeletingPost(true);
        const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
        if (res.ok) {
            setIsDeleted(true);
            setShowDeleteConfirm(false);
            toast.success("Post deleted");
        } else {
            const data = await res.json();
            toast.error(data.error || "Failed to delete post");
        }
        setDeletingPost(false);
    };

    const handleUpdatePost = async () => {
        const res = await fetch(`/api/posts/${post.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
        });
        if (res.ok) {
            setIsEditing(false);
            toast.success("Post updated");
        } else {
            toast.error("Failed to update post");
        }
    };

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            try {
                const res = await fetch(`/api/posts/${post.id}/comments`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data.comments || []);
                }
            } catch (error) {
                console.error("Failed to load comments", error);
                toast.error("Failed to load comments");
            }
            setLoadingComments(false);
        }
        setShowComments(!showComments);
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.comment) {
                    setComments([...comments, data.comment]);
                    setNewComment("");
                    setCommentCount(prev => prev + 1);
                }
            }
        } catch (error) {
            console.error("Failed to post comment", error);
            toast.error("Failed to post comment");
        }
        setSubmitting(false);
    };

    const deleteComment = async (commentId: string) => {
        const res = await fetch(`/api/posts/${post.id}/comments/${commentId}`, { method: "DELETE" });
        if (res.ok) {
            setComments(comments.filter(c => c.id !== commentId));
            setCommentCount(prev => Math.max(0, prev - 1));
            toast.success("Comment deleted");
        } else {
            const data = await res.json();
            toast.error(data.error || "Failed to delete comment");
        }
    };

    const saveCommentEdit = async (commentId: string) => {
        const res = await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editCommentContent }),
        });
        if (res.ok) {
            const data = await res.json();
            setComments(comments.map(c => c.id === commentId ? { ...c, content: data.comment.content } : c));
            setEditingCommentId(null);
        }
    };

    const toggleLike = async () => {
        if (likeBusy) return;
        setLikeBusy(true);

        // Optimistic update
        const prevLiked = hasLiked;
        const prevCount = likeCount;
        setHasLiked(!prevLiked);
        setLikeCount(prevCount + (prevLiked ? -1 : 1));

        try {
            const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
            if (!res.ok) throw new Error("failed");
            const data = await res.json();
            setHasLiked(!!data.liked);
            setLikeCount(data.like_count ?? 0);
        } catch {
            // Rollback
            setHasLiked(prevLiked);
            setLikeCount(prevCount);
            toast.error("Failed to update like");
        }
        setLikeBusy(false);
    };

    const openLikesDialog = async () => {
        setLikesDialogOpen(true);
        if (likesList === null) {
            try {
                const res = await fetch(`/api/posts/${post.id}/likes`);
                if (res.ok) {
                    const data = await res.json();
                    setLikesList(data.likes || []);
                }
            } catch (e) {
                console.error("Failed to load likes", e);
            }
        }
    };

    const openViewsDialog = async () => {
        setViewsDialogOpen(true);
        if (viewsList === null) {
            try {
                const res = await fetch(`/api/posts/${post.id}/views`);
                if (res.ok) {
                    const data = await res.json();
                    setViewsList(data.views || []);
                }
            } catch (e) {
                console.error("Failed to load views", e);
            }
        }
    };

    const getInitials = (firstName?: string, lastName?: string) => {
        return `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
    };

    const attachments = post.attachments || [];
    const imageAttachments = attachments.filter(isImage);
    const fileAttachments = attachments.filter((a) => !isImage(a));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
            transition={{ duration: 0.3 }}
        >
            <Card>
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <Avatar className="h-10 w-10">
                            {post.users?.avatar_url && <AvatarImage src={post.users.avatar_url} alt={`${post.users.first_name}'s avatar`} className="object-cover" />}
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(post.users?.first_name, post.users?.last_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">
                                    {post.users?.first_name} {post.users?.last_name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {canEditPost && (
                                        <div className="flex gap-1">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={handleUpdatePost} className="text-green-600 hover:text-green-700" aria-label="Save edit">
                                                        <Check className="h-3 w-3" />
                                                    </button>
                                                    <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground" aria-label="Cancel edit">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit post">
                                                        <Pencil className="h-3 w-3" />
                                                    </button>
                                                    <button onClick={() => setShowDeleteConfirm(true)} className="text-muted-foreground hover:text-red-500" aria-label="Delete post">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isEditing ? (
                                <Textarea
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    className="mt-2"
                                />
                            ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    <FormattedText text={post.content} />
                                </p>
                            )}

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
                        </div>
                    </div>
                </CardContent>

                <Separator />

                <CardFooter className="p-2 justify-start gap-1 flex-wrap">
                    <MotionButton
                        variant="ghost"
                        size="sm"
                        onClick={toggleLike}
                        disabled={likeBusy}
                        aria-pressed={hasLiked}
                        aria-label={hasLiked ? "Unlike post" : "Like post"}
                        className={cn(
                            "hover:text-foreground",
                            hasLiked ? "text-red-500" : "text-muted-foreground"
                        )}
                    >
                        <Heart className={cn("w-4 h-4 mr-2", hasLiked && "fill-current")} />
                        {likeCount > 0 ? (
                            <span
                                onClick={(e) => { e.stopPropagation(); openLikesDialog(); }}
                                className="hover:underline cursor-pointer"
                            >
                                {likeCount}
                            </span>
                        ) : (
                            "Like"
                        )}
                    </MotionButton>

                    <MotionButton
                        variant="ghost"
                        size="sm"
                        onClick={toggleComments}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {commentCount > 0 ? commentCount : "Comment"}
                    </MotionButton>

                    <button
                        type="button"
                        onClick={openViewsDialog}
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                        aria-label="See who viewed this post"
                    >
                        <Eye className="w-4 h-4" />
                        <span>{viewCount}</span>
                    </button>
                </CardFooter>

                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="overflow-hidden"
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            <Dialog open={likesDialogOpen} onOpenChange={setLikesDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Liked by {likeCount}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {likesList === null ? (
                            <div className="text-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : likesList.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No likes yet.</p>
                        ) : (
                            likesList.map((row) => (
                                <div key={row.user_id} className="flex items-center gap-3 py-1">
                                    <Avatar className="h-8 w-8">
                                        {row.users?.avatar_url && <AvatarImage src={row.users.avatar_url} alt="" className="object-cover" />}
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                            {getInitials(row.users?.first_name, row.users?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                        {row.users?.first_name} {row.users?.last_name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={viewsDialogOpen} onOpenChange={setViewsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Seen by {viewCount}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {viewsList === null ? (
                            <div className="text-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : viewsList.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No views yet.</p>
                        ) : (
                            viewsList.map((row) => (
                                <div key={row.user_id} className="flex items-center gap-3 py-1">
                                    <Avatar className="h-8 w-8">
                                        {row.users?.avatar_url && <AvatarImage src={row.users.avatar_url} alt="" className="object-cover" />}
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                            {getInitials(row.users?.first_name, row.users?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                        {row.users?.first_name} {row.users?.last_name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Delete post"
                description="This will permanently delete this post and all its comments."
                confirmLabel="Delete"
                variant="destructive"
                loading={deletingPost}
                onConfirm={handleDeletePost}
            />
        </motion.div>
    );
}
