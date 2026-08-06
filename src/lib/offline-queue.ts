import { idbGet, idbSet, idbDel, idbKeys } from "@/lib/offline-store";
import type {
  UpsertLogPayload,
  ToggleWeekPayload,
  AddRmRecordPayload,
} from "@/lib/supabase-sync";

export type OfflineAction =
  | { id: string; type: "upsert-log"; payload: UpsertLogPayload; createdAt: string }
  | { id: string; type: "toggle-week"; payload: ToggleWeekPayload; createdAt: string }
  | { id: string; type: "add-rm-record"; payload: AddRmRecordPayload; createdAt: string };

export const QUEUE_CHANGED_EVENT = "chameleon:queue-changed";

const QUEUE_PREFIX = "queue:";

export function emitQueueChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export async function enqueueAction(action: Omit<OfflineAction, "id">): Promise<void> {
  const id = `${QUEUE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await idbSet(id, action);
  emitQueueChanged();
}

export async function listActions(): Promise<OfflineAction[]> {
  const keys = await idbKeys();
  const queueKeys = keys.filter(k => k.startsWith(QUEUE_PREFIX)).sort();
  const actions: OfflineAction[] = [];
  for (const key of queueKeys) {
    const action = await idbGet<OfflineAction>(key);
    if (action) actions.push(action);
  }
  return actions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeAction(id: string): Promise<void> {
  await idbDel(id);
}

export async function countActions(): Promise<number> {
  const keys = await idbKeys();
  return keys.filter(k => k.startsWith(QUEUE_PREFIX)).length;
}
