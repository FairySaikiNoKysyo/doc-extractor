import { GoogleGenAI, Type, type Schema } from "@google/genai";

// LLM isolated here. Gemini is multimodal + supports structured JSON output,
// and is free — ideal for document extraction. Swap to Claude/OpenAI here.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function client() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

// Generic structure that fits most documents: a list of key/value fields plus
// an optional table (dynamic columns → string rows).
const EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      description: "Best guess at the document type (invoice, receipt, business card, table, form, etc.)",
    },
    summary: { type: Type.STRING, description: "One-sentence summary" },
    fields: {
      type: Type.ARRAY,
      description: "Key/value pairs extracted from the document",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ["label", "value"],
      },
    },
    table: {
      type: Type.OBJECT,
      description: "Any tabular/line-item data found (omit columns/rows if none)",
      properties: {
        columns: { type: Type.ARRAY, items: { type: Type.STRING } },
        rows: {
          type: Type.ARRAY,
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
  required: ["documentType", "fields"],
};

export type Extraction = {
  documentType: string;
  summary?: string;
  fields: { label: string; value: string }[];
  table?: { columns?: string[]; rows?: string[][] };
};

export async function extractDocument(
  imageBase64: string,
  mimeType: string,
): Promise<Extraction> {
  const res = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          {
            text: "Extract all useful information from this document image. Capture key fields as label/value pairs, and any tabular/line-item data as a table. Use the exact text from the document; do not invent values.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const text = res.text ?? "{}";
  return JSON.parse(text) as Extraction;
}

export async function askAboutDocument(
  imageBase64: string,
  mimeType: string,
  question: string,
): Promise<string> {
  const res = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: question },
        ],
      },
    ],
    config: {
      systemInstruction:
        "Answer the user's question about the document in the image. Use only what's visible; if it's not there, say so. Be concise.",
    },
  });
  return res.text ?? "";
}
