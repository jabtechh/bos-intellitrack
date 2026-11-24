// DEC-2026-019 — streams a decrypted identity reference only to the intern who
// owns it or to their directly assigned Company Supervisor. No public or
// signed Storage URL is ever exposed for reference images.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { identityDeps } from "@/lib/identity/runtime";
import { readReferenceImage } from "@/lib/identity/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ referenceId: string }> }) {
  const user = await requireCurrentUser();
  const id = z.string().uuid().safeParse((await params).referenceId);
  if (!id.success) return new NextResponse("Not found", { status: 404 });
  const image = await readReferenceImage(identityDeps(), { actor: { userId: user.id, role: user.role }, referenceId: id.data });
  if (!image) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(image.bytes), {
    headers: { "Content-Type": image.mimeType, "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
