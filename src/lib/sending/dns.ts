import "server-only";
import { promises as dns } from "node:dns";
import { parseDmarc, type DmarcResult } from "./rules";

export const OWNERSHIP_HOST = "_zendmail-verify";

export function ownershipRecordValue(token: string) {
  return `zendmail-verify=${token}`;
}

async function txt(host: string): Promise<string[]> {
  try {
    const chunks = await dns.resolveTxt(host);
    return chunks.map((parts) => parts.join(""));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return [];
    throw err; // timeouts / SERVFAIL: caller treats as "couldn't check", never as "absent"
  }
}

/** True/false when DNS answered; null when the lookup itself failed (so we don't mark a record missing by mistake). */
export async function checkOwnershipTxt(domain: string, token: string): Promise<boolean | null> {
  try {
    const records = await txt(`${OWNERSHIP_HOST}.${domain}`);
    return records.includes(ownershipRecordValue(token));
  } catch {
    return null;
  }
}

export async function lookupDmarc(domain: string): Promise<DmarcResult | null> {
  try {
    return parseDmarc(await txt(`_dmarc.${domain}`));
  } catch {
    return null;
  }
}
