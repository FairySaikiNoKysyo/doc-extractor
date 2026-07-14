"use client";

import { useRef, useState } from "react";

type Extraction = {
  documentType: string;
  summary?: string;
  fields: { label: string; value: string }[];
  table?: { columns?: string[]; rows?: string[][] };
};

type Img = { dataUrl: string; mimeType: string; base64: string };

const MAX_MB = 8;

export default function Extractor() {
  const [img, setImg] = useState<Img | null>(null);
  const [result, setResult] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_MB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImg({
        dataUrl,
        mimeType: file.type,
        base64: dataUrl.split(",")[1] ?? "",
      });
      setResult(null);
      setAnswer("");
    };
    reader.readAsDataURL(file);
  }

  async function extract() {
    if (!img || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: img.mimeType, data: img.base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setResult(data as Extraction);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!img || !question.trim() || asking) return;
    setAsking(true);
    setAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: img.mimeType,
          data: img.base64,
          question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setAnswer(data.answer);
    } catch (e) {
      setAnswer("⚠️ " + (e as Error).message);
    } finally {
      setAsking(false);
    }
  }

  function exportCsv() {
    if (!result) return;
    const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    let csv = "";
    if (result.table?.rows?.length) {
      const cols = result.table.columns ?? [];
      csv += cols.map(esc).join(",") + "\n";
      csv += result.table.rows.map((r) => r.map(esc).join(",")).join("\n");
    } else {
      csv += "Field,Value\n";
      csv += result.fields.map((f) => `${esc(f.label)},${esc(f.value)}`).join("\n");
    }
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "extraction.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          AI Document Extractor
        </h1>
        <p className="text-sm text-gray-500">
          Upload a receipt, invoice, business card, or any document. Gemini
          Vision pulls out structured data you can export or ask questions about.
        </p>
      </header>

      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center hover:border-gray-400"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.dataUrl}
            alt="document preview"
            className="mx-auto max-h-64 rounded-md"
          />
        ) : (
          <p className="text-sm text-gray-500">
            Click or drag an image here (PNG/JPG/WEBP, &lt; {MAX_MB} MB)
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {img && (
        <button
          onClick={extract}
          disabled={loading}
          className="mt-4 rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Extracting…" : "Extract data"}
        </button>
      )}

      {/* Results */}
      {result && (
        <section className="mt-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
              {result.documentType}
            </span>
            {result.summary && (
              <p className="text-sm text-gray-600">{result.summary}</p>
            )}
            <button
              onClick={exportCsv}
              className="ml-auto rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>

          {result.fields?.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200">
                  {result.fields.map((f, i) => (
                    <tr key={i}>
                      <td className="bg-gray-50 px-3 py-2 font-medium text-gray-700">
                        {f.label}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.table?.rows && result.table.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                {result.table.columns && (
                  <thead className="bg-gray-50">
                    <tr>
                      {result.table.columns.map((c, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left font-medium text-gray-700"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-200">
                  {result.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-gray-900">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Q&A */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Ask about this document
            </p>
            <form onSubmit={ask} className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What's the total before tax?"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
              <button
                disabled={asking || !question.trim()}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {asking ? "…" : "Ask"}
              </button>
            </form>
            {answer && (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {answer}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
