// Per business decision (2026-04-27): no delete affordances in UI for any user
// in any module. Backend DELETE endpoints remain operational so this can be
// flipped back to `true` (per-role gated where it was) in a single edit.
export const DELETE_RECORDS_ENABLED = false
