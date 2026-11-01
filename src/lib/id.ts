/** Collision-resistant id for sheets and cards. */
export function createId(): string {
  return crypto.randomUUID();
}
