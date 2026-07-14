import { askAboutDocument } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { mimeType?: string; data?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { mimeType, data, question } = body;
  if (!mimeType || !data || !question?.trim()) {
    return Response.json(
      { error: "Missing image or question" },
      { status: 400 },
    );
  }

  try {
    const answer = await askAboutDocument(data, mimeType, question);
    return Response.json({ answer });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
