import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

export type WooCommerceCredentials = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

export type WooCommerceResource = "products" | "orders";

export class WooCommerceRequestError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
  }
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

function isPublicAddress(address: string, family: number) {
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [first, second] = parts;
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return !(
      first === 0 || first === 10 || first === 127 || first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168)) ||
      (first === 198 && (second === 18 || second === 19 || second === 51)) ||
      (first === 203 && second === 0)
    );
  }

  if (family !== 6) return false;
  const normalized = address.toLowerCase();
  return !(
    normalized === "::" || normalized === "::1" || normalized.startsWith("::ffff:") ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") || normalized.startsWith("2001:10:")
  );
}

export async function requestWooCommerceJson<T = unknown>(
  credentials: WooCommerceCredentials,
  resource: WooCommerceResource,
  query: Record<string, string>
): Promise<{ data: T; totalPages: number }> {
  const storeUrl = new URL(credentials.storeUrl);
  const hostname = storeUrl.hostname.toLowerCase();
  if (
    storeUrl.protocol !== "https:" || storeUrl.username || storeUrl.password || storeUrl.search || storeUrl.hash ||
    (storeUrl.port && storeUrl.port !== "443") || isIP(hostname.replace(/^\[|\]$/g, "")) ||
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")
  ) {
    throw new WooCommerceRequestError("Use a public HTTPS WooCommerce URL without embedded credentials or query parameters.");
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new WooCommerceRequestError("The store domain could not be resolved.");
  }
  if (addresses.length === 0 || addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
    throw new WooCommerceRequestError("The store domain must resolve only to public internet addresses.");
  }

  const basePath = storeUrl.pathname.replace(/\/+$/, "");
  const endpoint = new URL(`${basePath}/wp-json/wc/v3/${resource}`, storeUrl.origin);
  Object.entries(query).forEach(([key, value]) => endpoint.searchParams.set(key, value));
  const resolvedAddress = addresses[0];
  const authorization = `Basic ${Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString("base64")}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = httpsRequest(endpoint, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authorization },
      servername: endpoint.hostname,
      lookup: (_hostname, _options, callback) => callback(null, resolvedAddress.address, resolvedAddress.family),
    }, (response) => {
      const chunks: Buffer[] = [];
      let responseBytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        responseBytes += buffer.length;
        if (responseBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error("Store response exceeded the allowed size."));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        if (settled) return;
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          const message = statusCode === 401 || statusCode === 403
            ? "WooCommerce rejected these credentials. Check the read-only REST API key."
            : statusCode === 429 || statusCode >= 500
              ? "WooCommerce is temporarily unavailable. Try syncing again shortly."
              : "WooCommerce rejected the request. Check the store URL and API access.";
          fail(new WooCommerceRequestError(message, statusCode));
          return;
        }

        try {
          const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
          settled = true;
          const totalPages = Number(response.headers["x-wp-totalpages"] ?? 1);
          resolve({ data, totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1 });
        } catch {
          fail(new WooCommerceRequestError("WooCommerce returned an invalid response."));
        }
      });
    });

    request.setTimeout(15_000, () => request.destroy(new Error("WooCommerce request timed out.")));
    request.on("error", () => fail(new WooCommerceRequestError("Could not reach WooCommerce securely.")));
    request.end();
  });
}