export interface MembershipDelta {
  /** IDs present in `selected` but not in `original` — to be inserted. */
  added: string[];
  /** IDs present in `original` but not in `selected` — to be deleted. */
  removed: string[];
}

/**
 * Diff two participant-ID lists. Order-independent. Callers pass already-unique
 * arrays (selection state is deduped), so duplicates are not specially handled.
 *
 * Examples:
 *   computeMembershipDelta(['a','b'], ['a','b'])       -> { added: [],    removed: [] }
 *   computeMembershipDelta(['a','b'], ['a','b','c'])   -> { added: ['c'], removed: [] }
 *   computeMembershipDelta(['a','b','c'], ['a'])       -> { added: [],    removed: ['b','c'] }
 *   computeMembershipDelta(['a','b'], ['b','c'])       -> { added: ['c'], removed: ['a'] }
 */
export function computeMembershipDelta(original: string[], selected: string[]): MembershipDelta {
  const originalSet = new Set(original);
  const selectedSet = new Set(selected);
  return {
    added: selected.filter((id) => !originalSet.has(id)),
    removed: original.filter((id) => !selectedSet.has(id)),
  };
}
