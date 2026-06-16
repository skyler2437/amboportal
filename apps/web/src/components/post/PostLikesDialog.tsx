"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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

export function PostLikesDialog({
    open,
    onOpenChange,
    likeCount,
    likesList,
    getInitials,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    likeCount: number;
    likesList: LikeRow[] | null;
    getInitials: (firstName?: string, lastName?: string) => string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
    );
}
