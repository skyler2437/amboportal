export type User = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    email: string;
    avatar_url?: string;
};

export type Message = {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        first_name: string;
        last_name: string;
    };
};

export type Group = {
    id: string;
    name: string | null;
    created_by: string;
    created_at: string;
    updated_at?: string;
    participants?: { user: User }[];
    last_message?: Message;
    starred?: boolean;
};
