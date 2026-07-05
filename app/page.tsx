"use client";

import { useEffect, useRef, useState } from "react";
import type { LoggedMeal, MealAnalysis } from "@/app/lib/meal";

const STORAGE_KEY = "snapplate.log.v1";

// Downscale a photo to <=1024px on the long edge and re-encode as JPEG. Phone
// photos are often 4-12MB; this keeps the upload (and Claude's image token cost)
// small without hurting recognition. Returns { base64, mediaType }.
async function fileToScaledBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode image."));
    el.src = dataUrl;
  });

  const MAX = 1024;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1], mediaType: "image/jpeg" };
}

function scoreColor(score: number): string {
  if (score >= 67) return "var(--green)";
  if (score >= 34) return "var(--amber)";
  return "var(--red)";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [log, setLog] = useState<LoggedMeal[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load today's log on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all = JSON.parse(raw) as LoggedMeal[];
        setLog(all.filter((m) => m.loggedAt.slice(0, 10) === todayKey()));
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persist(next: LoggedMeal[]) {
    setLog(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function analyze() {
    if (!pendingFile) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const { base64, mediaType } = await fileToScaledBase64(pendingFile);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data as MealAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function addToLog() {
    if (!analysis) return;
    const entry: LoggedMeal = {
      ...analysis,
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    };
    persist([entry, ...log]);
    reset();
  }

  function removeFromLog(id: string) {
    persist(log.filter((m) => m.id !== id));
  }

  function reset() {
    setPendingFile(null);
    setPreviewUrl(null);
    setAnalysis(null);
    setNote("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const dayCalories = log.reduce((sum, m) => sum + (m.total?.calories || 0), 0);

  return (
    <div className="wrap">
      <header className="hero">
        <span className="logo">
          <span className="dot" /> SnapPlate
        </span>
        <p className="tagline">
          Snap a meal — get calories, macros, and a tip to make it healthier.
        </p>
      </header>

      <main className="card">
        {!previewUrl ? (
          <div
            className={`dropzone${dragging ? " drag" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="icon">🍽️</div>
            <p>Tap to take or choose a photo</p>
            <small>JPEG, PNG, or WebP · your photo never leaves your device except to analyze</small>
          </div>
        ) : (
          <>
            <div className="preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Selected meal" />
            </div>
            {!analysis && (
              <>
                <div className="note-row">
                  <input
                    type="text"
                    placeholder="Optional: anything the photo misses? (e.g. 'cooked in olive oil')"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="actions">
                  <button
                    className="btn btn-primary"
                    onClick={analyze}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Analyzing…
                      </>
                    ) : (
                      "Analyze meal"
                    )}
                  </button>
                  <button className="btn btn-ghost" onClick={reset} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {error && <div className="error">{error}</div>}

        {analysis &&
          (analysis.is_food ? (
            <div className="result">
              {analysis.demo && (
                <div className="demo-banner">
                  🧪 <strong>Demo data</strong> — no API key set, so this is a sample
                  result (not based on your photo). Add an <code>ANTHROPIC_API_KEY</code>{" "}
                  to analyze real meals.
                </div>
              )}
              <div className="result-head">
                <div>
                  <h2>{analysis.dish_name}</h2>
                  <span className="confidence">
                    {analysis.confidence} confidence estimate
                  </span>
                </div>
                <div className="score">
                  <div
                    className="num"
                    style={{ color: scoreColor(analysis.health_score) }}
                  >
                    {analysis.health_score}
                  </div>
                  <div className="label">health</div>
                </div>
              </div>

              <div className="macros">
                <div className="macro">
                  <div className="v">{Math.round(analysis.total.calories)}</div>
                  <div className="k">kcal</div>
                </div>
                <div className="macro">
                  <div className="v">{Math.round(analysis.total.protein_g)}g</div>
                  <div className="k">protein</div>
                </div>
                <div className="macro">
                  <div className="v">{Math.round(analysis.total.carbs_g)}g</div>
                  <div className="k">carbs</div>
                </div>
                <div className="macro">
                  <div className="v">{Math.round(analysis.total.fat_g)}g</div>
                  <div className="k">fat</div>
                </div>
              </div>

              <ul className="items">
                {analysis.items.map((it, i) => (
                  <li key={i}>
                    <span>
                      <span className="name">{it.name}</span>
                      <br />
                      <span className="portion">{it.estimated_portion}</span>
                    </span>
                    <span className="cal">{Math.round(it.calories)} kcal</span>
                  </li>
                ))}
              </ul>

              <div className="tip">
                <strong>Make it healthier:</strong> {analysis.healthier_tip}
              </div>

              <div className="actions">
                <button className="btn btn-primary" onClick={addToLog}>
                  Add to today&apos;s log
                </button>
                <button className="btn btn-ghost" onClick={reset}>
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="result">
              <div className="error">
                That doesn&apos;t look like food. {analysis.healthier_tip}
              </div>
              <div className="actions">
                <button className="btn btn-ghost" onClick={reset}>
                  Try another photo
                </button>
              </div>
            </div>
          ))}
      </main>

      <section className="log">
        <div className="log-head">
          <h3>Today&apos;s log</h3>
          <span className="log-total">{Math.round(dayCalories)} kcal</span>
        </div>
        {log.length === 0 ? (
          <p className="empty">No meals logged yet today. Snap your first one above.</p>
        ) : (
          <ul className="log-list">
            {log.map((m) => (
              <li key={m.id}>
                <span className="l-name">{m.dish_name}</span>
                <span className="l-time">
                  {new Date(m.loggedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="l-cal">{Math.round(m.total.calories)} kcal</span>
                <button
                  className="remove"
                  onClick={() => removeFromLog(m.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        Estimates are AI-generated and approximate — not medical or dietary advice.
        <br />
        Built with Claude vision · derived from PS-1 project #10.
      </footer>
    </div>
  );
}
