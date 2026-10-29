import type { EmailDocument } from "./document";

/**
 * Autosave coordinator, independent of React so its edge cases are unit tested:
 * - changes are debounced; only ONE save is ever in flight; edits made during a save trigger a follow-up save
 * - each save carries the last known server revision (optimistic concurrency)
 * - network failures retry with backoff; a definitive refusal (conflict, locked, expired session) stops the queue
 */

export type SaveStatus = "saved" | "dirty" | "saving" | "retrying" | "blocked";

export type SaveOutcome =
  | { ok: true; revision: number; savedAt: string }
  | { ok: false; reason: string; message: string };

export type SaveQueueOptions = {
  save: (input: { expectedRevision: number; document: EmailDocument }) => Promise<SaveOutcome>;
  snapshot: () => { version: number; document: EmailDocument };
  initialRevision: number;
  initialVersion?: number;
  debounceMs?: number;
  onStatus: (status: SaveStatus, info: { message?: string; savedAt?: string }) => void;
};

const BACKOFF = [2000, 4000, 8000, 15000];

export function createSaveQueue(opts: SaveQueueOptions) {
  const debounceMs = opts.debounceMs ?? 800;
  let revision = opts.initialRevision;
  let savedVersion = opts.initialVersion ?? 0;
  let inFlight: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let blocked = false;
  let disposed = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const schedule = (ms: number) => {
    clear();
    timer = setTimeout(() => void run(), ms);
  };

  async function run(): Promise<boolean> {
    clear();
    if (disposed || blocked) return false;
    if (inFlight) return inFlight;
    const { version, document } = opts.snapshot();
    if (version === savedVersion) {
      opts.onStatus("saved", {});
      return true;
    }
    opts.onStatus("saving", {});
    inFlight = (async () => {
      try {
        const result = await opts.save({ expectedRevision: revision, document });
        if (!result.ok) {
          blocked = true;
          opts.onStatus("blocked", { message: result.message });
          return false;
        }
        revision = result.revision;
        savedVersion = version;
        failures = 0;
        if (opts.snapshot().version !== savedVersion) {
          opts.onStatus("dirty", {});
          schedule(debounceMs); // edited while saving
        } else {
          opts.onStatus("saved", { savedAt: result.savedAt });
        }
        return true;
      } catch {
        failures += 1;
        opts.onStatus("retrying", { message: "Connection problem. Retrying…" });
        schedule(BACKOFF[Math.min(failures - 1, BACKOFF.length - 1)]);
        return false;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    /** Call after every document change. */
    notify() {
      if (disposed || blocked) return;
      if (opts.snapshot().version === savedVersion) return;
      opts.onStatus("dirty", {});
      if (!inFlight) schedule(debounceMs);
    },
    /** Saves immediately and resolves true when everything is persisted. */
    async flush(): Promise<boolean> {
      clear();
      for (let i = 0; i < 3; i++) {
        if (blocked) return false;
        if (inFlight) await inFlight;
        if (opts.snapshot().version === savedVersion) return true;
        const ok = await run();
        if (!ok && !inFlight && opts.snapshot().version !== savedVersion && blocked) return false;
      }
      return opts.snapshot().version === savedVersion;
    },
    isDirty: () => opts.snapshot().version !== savedVersion,
    dispose() {
      disposed = true;
      clear();
    },
  };
}
