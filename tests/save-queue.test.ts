import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue, type SaveOutcome, type SaveStatus } from "@/lib/email-builder/save-queue";
import { DEFAULT_THEME } from "@/lib/email-builder/theme";

const doc = { blocks: [], theme: DEFAULT_THEME };

function setup(save: (rev: number) => Promise<SaveOutcome>) {
  let version = 0;
  const statuses: SaveStatus[] = [];
  const calls: number[] = [];
  const q = createSaveQueue({
    initialRevision: 5,
    snapshot: () => ({ version, document: doc }),
    save: async ({ expectedRevision }) => { calls.push(expectedRevision); return save(expectedRevision); },
    onStatus: (s) => statuses.push(s),
  });
  return { q, calls, statuses, edit: () => { version += 1; q.notify(); } };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("save queue", () => {
  it("debounces bursts into one save and advances the revision", async () => {
    const t = setup(async (r) => ({ ok: true, revision: r + 1, savedAt: "x" }));
    t.edit(); t.edit(); t.edit();
    await vi.advanceTimersByTimeAsync(900);
    expect(t.calls).toEqual([5]);
    t.edit();
    await vi.advanceTimersByTimeAsync(900);
    expect(t.calls).toEqual([5, 6]);
    expect(t.statuses.at(-1)).toBe("saved");
  });

  it("never runs two saves at once and follows up on edits made mid-save", async () => {
    let release!: () => void;
    let n = 0;
    const t = setup((r) => new Promise((res) => { n += 1; if (n === 1) release = () => res({ ok: true, revision: r + 1, savedAt: "x" }); else res({ ok: true, revision: r + 1, savedAt: "x" }); }));
    t.edit();
    await vi.advanceTimersByTimeAsync(900);
    expect(t.calls).toHaveLength(1);
    t.edit(); // during the first save
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.calls).toHaveLength(1);
    release();
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.calls).toEqual([5, 6]);
  });

  it("retries after network failures with the same revision", async () => {
    let fail = 2;
    const t = setup(async (r) => { if (fail-- > 0) throw new Error("offline"); return { ok: true, revision: r + 1, savedAt: "x" }; });
    t.edit();
    await vi.advanceTimersByTimeAsync(900);
    expect(t.statuses).toContain("retrying");
    await vi.advanceTimersByTimeAsync(20000);
    expect(t.calls).toEqual([5, 5, 5]);
    expect(t.statuses.at(-1)).toBe("saved");
  });

  it("stops on a conflict instead of overwriting", async () => {
    const t = setup(async () => ({ ok: false, reason: "conflict", message: "changed elsewhere" }));
    t.edit();
    await vi.advanceTimersByTimeAsync(900);
    expect(t.statuses.at(-1)).toBe("blocked");
    t.edit();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.calls).toHaveLength(1);
    expect(await t.q.flush()).toBe(false);
  });

  it("flush saves immediately", async () => {
    const t = setup(async (r) => ({ ok: true, revision: r + 1, savedAt: "x" }));
    t.edit();
    expect(await t.q.flush()).toBe(true);
    expect(t.calls).toEqual([5]);
  });
});
