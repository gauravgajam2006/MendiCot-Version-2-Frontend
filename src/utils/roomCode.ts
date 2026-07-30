export const ROOM_CODE_LENGTH = 8;

/** Normalizes room IDs to the backend's eight-character alphanumeric format. */
export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}
