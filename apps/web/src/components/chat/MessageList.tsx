"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Send, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Message = {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    like_count?: number;
    liked?: boolean;
    sender?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
    }
};

interface MessageListProps {
    groupId: string;
    currentUserId: string;
    currentUserFirstName?: string;
    currentUserLastName?: string;
    currentUserAvatarUrl?: string;
}

export function MessageList({ groupId, currentUserId, currentUserFirstName = "", currentUserLastName = "", currentUserAvatarUrl = "" }: MessageListProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputEmpty, setInputEmpty] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/chat/messages?groupId=${groupId}`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages as Message[]);
                    scrollToBottom();
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
            setLoading(false);
        };

        fetchMessages();

        // Real-time subscription for new messages
        const channel = supabase
            .channel(`chat:${groupId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `group_id=eq.${groupId}`,
                },
                async (payload) => {
                    const newMsg = payload.new as Message;

                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) {
                            return prev;
                        }
                        return [...prev, { ...newMsg, sender: { first_name: '...', last_name: '' } }];
                    });

                    // Fetch sender info via API
                    try {
                        const res = await fetch(`/api/chat/users`);
                        if (res.ok) {
                            const data = await res.json();
                            const sender = data.users?.find?.((u: { id: string }) => u.id === newMsg.sender_id);
                            if (sender) {
                                setMessages((prev) =>
                                    prev.map((m) =>
                                        m.id === newMsg.id
                                            ? { ...m, sender: { first_name: sender.first_name, last_name: sender.last_name, avatar_url: sender.avatar_url } }
                                            : m
                                    )
                                );
                            }
                        }
                    } catch {
                        // Sender lookup is best-effort
                    }

                    scrollToBottom();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "chat_message_likes" },
                (payload) => {
                    const row = (payload.new ?? payload.old) as { message_id?: string } | null;
                    const messageId = row?.message_id;
                    if (!messageId) return;
                    setMessages((prev) => {
                        if (!prev.some((m) => m.id === messageId)) return prev;
                        const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
                        if (delta === 0) return prev;
                        return prev.map((m) =>
                            m.id === messageId
                                ? { ...m, like_count: Math.max(0, (m.like_count ?? 0) + delta) }
                                : m
                        );
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId, supabase, scrollToBottom]);

    const getInputText = (): string => {
        return inputRef.current?.textContent?.trim() || "";
    };

    const clearInput = () => {
        if (inputRef.current) {
            inputRef.current.textContent = "";
            setInputEmpty(true);
        }
    };

    const handleSend = async () => {
        const messageContent = getInputText();
        if (!messageContent || sending) return;

        clearInput();
        inputRef.current?.focus();

        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMsg: Message = {
            id: optimisticId,
            sender_id: currentUserId,
            content: messageContent,
            created_at: new Date().toISOString(),
            sender: { first_name: currentUserFirstName, last_name: currentUserLastName, avatar_url: currentUserAvatarUrl || undefined },
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();

        setSending(true);
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId, content: messageContent }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((prev) => {
                    const realMessageId = data.message.id;
                    const alreadyExists = prev.some((m) => m.id === realMessageId);

                    if (alreadyExists) {
                        return prev.filter((m) => m.id !== optimisticId);
                    }

                    return prev.map((m) =>
                        m.id === optimisticId
                            ? { ...data.message, sender: optimisticMsg.sender }
                            : m
                    );
                });
            } else {
                console.error("Failed to send message");
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
                toast.error("Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message", error);
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        setInputEmpty(!getInputText());
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    };

    const toggleLike = useCallback(async (messageId: string) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId
                    ? { ...m, liked: !m.liked, like_count: (m.like_count ?? 0) + (m.liked ? -1 : 1) }
                    : m
            )
        );
        try {
            const res = await fetch(`/api/chat/messages/${messageId}/like`, { method: "POST" });
            if (!res.ok) throw new Error("like failed");
            const data = await res.json();
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId ? { ...m, liked: !!data.liked, like_count: data.like_count ?? 0 } : m
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId
                        ? { ...m, liked: !m.liked, like_count: (m.like_count ?? 0) + (m.liked ? 1 : -1) }
                        : m
                )
            );
            toast.error("Failed to update like");
        }
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Messages area - native scroll for best mobile keyboard behavior */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-4 py-3">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex justify-center py-8 text-muted-foreground text-sm">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        <div className="space-y-2" aria-live="polite" aria-label="Chat messages">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId;
                                const firstName = isMe ? currentUserFirstName : (msg.sender?.first_name || "?");
                                const lastName = isMe ? currentUserLastName : (msg.sender?.last_name || "");
                                const initials = `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex",
                                            isMe ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {!isMe && (
                                            <Avatar className="h-7 w-7 mt-5 mr-2 shrink-0">
                                                {msg.sender?.avatar_url && <AvatarImage src={msg.sender.avatar_url} alt={`${msg.sender.first_name}'s avatar`} className="object-cover" />}
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn(
                                            "flex flex-col max-w-[80%]",
                                            isMe ? "items-end" : "items-start"
                                        )}>
                                            {!isMe && msg.sender && (
                                                <span className="text-[11px] text-muted-foreground mb-0.5 px-3 font-medium">
                                                    {msg.sender.first_name}
                                                </span>
                                            )}
                                            <div
                                                className={cn(
                                                    "px-3.5 py-2 text-sm leading-relaxed",
                                                    isMe
                                                        ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[4px]"
                                                        : "bg-muted rounded-[18px] rounded-bl-[4px]"
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-0.5 px-3">
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleLike(msg.id)}
                                                className={cn(
                                                    "mt-0.5 px-3 flex items-center gap-1 text-[11px] transition-colors",
                                                    msg.liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                                                )}
                                                aria-pressed={!!msg.liked}
                                                aria-label={msg.liked ? "Unlike message" : "Like message"}
                                            >
                                                <Heart className={cn("w-3.5 h-3.5", msg.liked && "fill-current")} />
                                                {(msg.like_count ?? 0) > 0 && <span>{msg.like_count}</span>}
                                            </button>
                                        </div>
                                        {isMe && (
                                            <Avatar className="h-7 w-7 mt-1 ml-2 shrink-0">
                                                {currentUserAvatarUrl && <AvatarImage src={currentUserAvatarUrl} alt="Your avatar" className="object-cover" />}
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input bar - minimal chrome, sits flush above keyboard */}
            <div className="shrink-0 bg-background border-t px-3 py-2">
                <div className="flex items-end gap-2">
                    <div
                        ref={inputRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="chat-editable-input flex-1 min-h-[36px] max-h-[100px] overflow-y-auto rounded-full bg-muted px-4 py-2 text-sm outline-none leading-relaxed"
                        data-placeholder="Message"
                        enterKeyHint="send"
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        onPaste={handlePaste}
                        role="textbox"
                        aria-label="Message input"
                    />
                    <Button
                        size="icon"
                        className="rounded-full h-9 w-9 shrink-0"
                        disabled={sending || inputEmpty}
                        onClick={handleSend}
                        aria-label="Send message"
                    >
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
