import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { uploadedImages } from "@/db/schema";

/** Public image bytes for emails and landing pages. The random id is the access control, like an object-storage link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await db.select({ contentType: uploadedImages.contentType, data: uploadedImages.data }).from(uploadedImages).where(eq(uploadedImages.id, id)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
