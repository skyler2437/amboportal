export type RsvpStatus = "going" | "maybe" | "no";

export interface RsvpTint {
    bg: string;
    border: string;
    accent: string;
}

export const RSVP_TINT: Record<RsvpStatus, RsvpTint> = {
    going: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#10b981" },
    maybe: { bg: "#fffbeb", border: "#fde68a", accent: "#f59e0b" },
    no: { bg: "#f9fafb", border: "#e5e7eb", accent: "#9ca3af" },
};

export const DEFAULT_TINT: RsvpTint = {
    bg: "", // empty = let the card use its default background
    border: "",
    accent: "transparent",
};

export function tintForStatus(status: string | null | undefined): RsvpTint {
    if (status === "going" || status === "maybe" || status === "no") {
        return RSVP_TINT[status];
    }
    return DEFAULT_TINT;
}
