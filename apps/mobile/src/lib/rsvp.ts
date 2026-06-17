import type { EventWithRsvp } from '@/hooks/useEvents';

/** Display labels for the default RSVP statuses. */
export const RSVP_LABEL: Record<string, string> = {
  going: 'Going',
  maybe: 'Maybe',
  no: "Can't Go",
};

/** MaterialCommunityIcons names for the default RSVP statuses. */
export const RSVP_ICON: Record<string, string> = {
  going: 'check-circle-outline',
  maybe: 'help-circle-outline',
  no: 'close-circle-outline',
};

/**
 * The label + status to render for the current user's RSVP on an event card,
 * or null when they haven't responded. A custom option label takes precedence
 * for "going".
 */
export function getRsvpDisplay(item: EventWithRsvp): { label: string; status: string } | null {
  const status = item.myRsvpStatus;
  if (!status) return null;
  if (status === 'going' && item.myRsvpOptionLabel) {
    return { label: `Going: ${item.myRsvpOptionLabel}`, status };
  }
  return { label: RSVP_LABEL[status] || status, status };
}
