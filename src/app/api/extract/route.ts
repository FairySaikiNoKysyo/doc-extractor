import { extractDocument } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { mimeType?: string; data?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { mimeType, data } = body;
  if (!mimeType || !data) {
    return Response.json(
      { error: "Missing image (mimeType + data)" },
      { status: 400 },
    );
  }
  if (!mimeType.startsWith("image/")) {
    return Response.json({ error: "Only images are supported" }, { status: 400 });
  }

  try {
    const extraction = await extractDocument(data, mimeType);
    return Response.json(extraction);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
