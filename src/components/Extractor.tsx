"use client";

import { useRef, useState } from "react";
import Spinner from "@/components/Spinner";
import Callout from "@/components/Callout";

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

  function setImage(dataUrl: string, mimeType: string) {
    setImg({ dataUrl, mimeType, base64: dataUrl.split(",")[1] ?? "" });
    setResult(null);
    setAnswer("");
    setQuestion("");
    setError("");
  }

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
    reader.onload = () => setImage(String(reader.result), file.type);
    reader.readAsDataURL(file);
  }

  // Generate a sample receipt on a canvas so a visitor with no document handy
  // can still try the extractor end-to-end. Kept high-contrast + monospace so
  // Gemini Vision reads it reliably.
  function loadSample() {
    const W = 400;
    const H = 580;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111111";
    ctx.textBaseline = "top";

    ctx.textAlign = "center";
    ctx.font = "bold 24px monospace";
    ctx.fillText("NORTHWIND CAFE", W / 2, 26);
    ctx.font = "13px monospace";
    ctx.fillText("123 Market Street, Berlin", W / 2, 58);
    ctx.fillText("Tel: +49 30 555 0100", W / 2, 76);

    ctx.textAlign = "left";
    ctx.font = "15px monospace";
    const x = 26;
    let y = 110;
    const line = (s: string) => {
      ctx.fillText(s, x, y);
      y += 22;
    };
    const rule = () => line("------------------------------");
    line("Date: 2024-05-14  14:32");
    line("Receipt #: 100482");
    rule();
    line("Item            Qty   Price");
    rule();
    line("Cappuccino       2    7.00");
    line("Croissant        3    9.00");
    line("Avocado Toast    1    8.50");
    line("Orange Juice     2    6.00");
    rule();
    line("Subtotal            30.50");
    line("VAT (19%)            5.80");
    ctx.font = "bold 15px monospace";
    line("TOTAL               36.30");
    ctx.font = "15px monospace";
    rule();
    line("Paid: Visa ****4321");
    y += 8;
    ctx.textAlign = "center";
    ctx.fillText("Thank you for your visit!", W / 2, y);

    setImage(c.toDataURL("image/png"), "image/png");
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
      csv += result.fields
        .map((f) => `${esc(f.label)},${esc(f.value)}`)
        .join("\n");
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
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          AI Document Extractor
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a receipt, invoice, business card, or any document. Gemini
          Vision pulls out structured data you can export or ask questions
          about.
        </p>
      </header>

      <Callout icon="🧾" className="mb-6">
        <p className="font-medium">How it works</p>
        <ol className="list-decimal space-y-0.5 pl-4">
          <li>Upload an image (or use the sample) — nothing is stored.</li>
          <li>Get structured fields + a table you can export to CSV.</li>
          <li>Ask follow-up questions about the same document.</li>
        </ol>
      </Callout>

      {/* Upload */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition-colors hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.dataUrl}
            alt="document preview"
            className="mx-auto max-h-64 rounded-md"
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
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

      {/* Sample shortcut */}
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        No document handy?{" "}
        <button
          type="button"
          onClick={loadSample}
          className="font-medium text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Try a sample receipt
        </button>
      </p>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {img && (
        <button
          onClick={extract}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {loading && <Spinner />}
          {loading ? "Extracting…" : "Extract data"}
        </button>
      )}

      {/* Results */}
      {result && (
        <section className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900">
              {result.documentType}
            </span>
            {result.summary && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.summary}
              </p>
            )}
            <button
              onClick={exportCsv}
              className="ml-auto rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Export CSV
            </button>
          </div>

          {result.fields?.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {result.fields.map((f, i) => (
                    <tr key={i}>
                      <td className="bg-gray-50 px-3 py-2 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {f.label}
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {f.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.table?.rows && result.table.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                {result.table.columns && (
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {result.table.columns.map((c, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {result.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 text-gray-900 dark:text-gray-100"
                        >
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
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Ask about this document
            </p>
            <form onSubmit={ask} className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What's the total before tax?"
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-100"
              />
              <button
                disabled={asking || !question.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {asking && <Spinner />}
                Ask
              </button>
            </form>
            {answer && (
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {answer}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
