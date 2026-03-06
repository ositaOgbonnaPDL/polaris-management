// All approval actions are now session-authenticated via internal-actions.ts.
// The old token-based processApprovalAction has been removed.
export { processInternalApproval } from "./internal-actions";
