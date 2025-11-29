// AiTools.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaMagic,
  FaPlay,
  FaPause,
  FaDownload,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

/**
 * AiTools (final, intact)
 *
 * Backend endpoints:
 * - POST {API_PREFIX}/info               -> { title, thumbnail, uploader, platform, id, ... }
 * - POST {API_PREFIX}/generate-music     -> form-data: url or file -> { results: [{ title, description, stream_url }, ...] }
 * - GET  {API_PREFIX}/proxy-image?url=... -> thumbnail proxy
 *
 * If your backend is mounted at /api, set API_PREFIX = "/api"
 */
const API_PREFIX = ""; // set to "/api" if backend routes are prefixed

export default function AiTools() {
  const [mode, setMode] = useState("url"); // "url" | "file"
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [genError, setGenError] = useState("");

  const audioRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);

  const debounceRef = useRef(null);
  const dropRef = useRef(null);

  // Single Audio instance + cleanup
  useEffect(() => {
    audioRef.current = new Audio();
    const onEnded = () => setPlayingUrl(null);
    audioRef.current.addEventListener("ended", onEnded);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", onEnded);
        audioRef.current.src = "";
        audioRef.current = null;
      }
      clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounced preview fetch for URL mode
  useEffect(() => {
    if (mode !== "url") return;
    clearTimeout(debounceRef.current);

    if (!url.trim()) {
      setPreview(null);
      setPreviewError("");
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    debounceRef.current = setTimeout(() => fetchPreview(url.trim()), 500);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, mode]);

  // Drag & drop handlers
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      stop(e);
      const incoming = e.dataTransfer.files && e.dataTransfer.files[0];
      if (incoming) handleFile(incoming);
    };

    el.addEventListener("dragenter", stop);
    el.addEventListener("dragover", stop);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", stop);
      el.removeEventListener("dragover", stop);
      el.removeEventListener("drop", onDrop);
    };
  }, [dropRef.current]);

  // Fetch preview from backend and surface backend errors
  async function fetchPreview(inputUrl) {
    setPreviewLoading(true);
    setPreview(null);
    setPreviewError("");
    try {
      const res = await fetch(`${API_PREFIX}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });

      // Try to parse JSON or text; backend may include detail
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        // If backend returned { detail: "..."} prefer that
        let msg = typeof body === "object" && body ? body.detail || JSON.stringify(body) : String(body || "Preview not available");
        // Clean up repeated verbose yt-dlp errors if present
        if (msg && msg.includes("ERROR:")) msg = msg.split("ERROR:").pop().trim();
        throw new Error(msg);
      }

      const data = typeof body === "object" ? body : {};
      setPreview({
        title: data.title || "Unknown title",
        thumbnail: data.thumbnail,
        uploader: data.uploader || data.uploader_id || "Unknown",
        platform: data.platform || "Web",
        id: data.id,
      });
    } catch (err) {
      setPreviewError(err?.message || "Could not fetch preview. Check URL or try again.");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  // File validation and preview creation
  function handleFile(incomingFile) {
    if (!incomingFile) return;
    const mime = incomingFile.type || "";
    if (!mime.startsWith("audio/") && !mime.startsWith("video/")) {
      setPreviewError("Unsupported file type. Upload audio or video.");
      return;
    }
    if (incomingFile.size > 50 * 1024 * 1024) {
      setPreviewError("File too large — max 50MB.");
      return;
    }
    setFile(incomingFile);
    setPreview({
      title: incomingFile.name,
      uploader: "Local file",
      platform: "Upload",
      thumbnail: null,
    });
    setPreviewError("");
    setResults([]);
    setGenError("");
  }

  // Trigger generation: POST formData to backend
  async function handleGenerate() {
    setGenError("");
    setResults([]);
    if (mode === "url" && !preview) {
      setGenError("Wait for the preview to load before generating.");
      return;
    }
    if (mode === "file" && !file) {
      setGenError("Please select a file to upload.");
      return;
    }

    setIsGenerating(true);
    try {
      const form = new FormData();
      if (mode === "url") form.append("url", url.trim());
      else form.append("file", file);

      const res = await fetch(`${API_PREFIX}/generate-music`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        // Prefer JSON error { detail: "..."} but accept plain text
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : await res.text();
        let msg = typeof body === "object" ? body.detail || JSON.stringify(body) : String(body || "Generation failed");
        throw new Error(msg);
      }
      const json = await res.json();
      setResults(Array.isArray(json.results) ? json.results : []);
    } catch (err) {
      setGenError(err?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  // Play/pause single audio instance
  async function togglePlay(streamUrl) {
    if (!audioRef.current) return;
    if (playingUrl === streamUrl) {
      audioRef.current.pause();
      setPlayingUrl(null);
      return;
    }

    try {
      audioRef.current.pause();
      audioRef.current.src = streamUrl;
      await audioRef.current.play();
      setPlayingUrl(streamUrl);
    } catch (err) {
      console.warn("Playback error", err);
      setGenError("Playback failed. Try again or download the file.");
    }
  }

  return (
    <div className="ai-tools" style={{ padding: 12 }}>
      <h2 className="ai-heading" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FaMagic style={{ color: "#8b5cf6" }} /> AI Music Lab
      </h2>

      {/* Mode toggles */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => {
            setMode("url");
            setFile(null);
            setResults([]);
            setGenError("");
            setPreviewError("");
          }}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: mode === "url" ? "#8b5cf6" : "#374151",
            color: "white",
            fontWeight: 700,
          }}
          aria-pressed={mode === "url"}
        >
          Paste URL
        </button>

        <button
          onClick={() => {
            setMode("file");
            setUrl("");
            setResults([]);
            setGenError("");
            setPreviewError("");
          }}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: mode === "file" ? "#8b5cf6" : "#374151",
            color: "white",
            fontWeight: 700,
          }}
          aria-pressed={mode === "file"}
        >
          Upload File
        </button>
      </div>

      {/* Input area */}
      <div style={{ marginBottom: 16 }}>
        {mode === "url" ? (
          <>
            <input
              placeholder="Paste YouTube, SoundCloud, or Instagram link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#111827",
                color: "white",
              }}
              aria-label="Media URL"
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchPreview(url.trim());
              }}
            />

            {previewLoading && (
              <div style={{ color: "#9ca3af", marginTop: 10, fontStyle: "italic" }}>Finding song…</div>
            )}

            {previewError && !previewLoading && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "rgba(239, 68, 68, 0.07)",
                  border: "1px solid #ef4444",
                  borderRadius: 8,
                  color: "#ffb4b4",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                role="alert"
              >
                <FaExclamationCircle /> {previewError}
              </div>
            )}

            {preview && !previewLoading && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#0b1220",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(139,92,246,0.12)",
                }}
              >
                {preview.thumbnail ? (
                  <img
                    src={`${API_PREFIX}/proxy-image?url=${encodeURIComponent(preview.thumbnail)}`}
                    alt=""
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                  />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: 8, background: "#111827" }} />
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                    Target Audio Source
                  </div>
                  <div style={{ color: "white", fontWeight: 700, marginTop: 6 }}>{preview.title}</div>
                  <div style={{ color: "#9ca3af", marginTop: 4 }}>
                    {preview.uploader} • {preview.platform}
                  </div>
                </div>

                <div>
                  <FaCheckCircle color="#8b5cf6" size={22} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            ref={dropRef}
            style={{
              border: "2px dashed #374151",
              padding: 26,
              borderRadius: 10,
              textAlign: "center",
              color: "#9ca3af",
              position: "relative",
            }}
            aria-label="File upload drop zone"
          >
            <FaCloudUploadAlt size={36} style={{ marginBottom: 8 }} />

            <div style={{ marginBottom: 8 }}>
              {file ? (
                <strong style={{ color: "#8b5cf6" }}>{file.name}</strong>
              ) : (
                <>
                  Click to upload or drag & drop here
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Accepts audio & video, max 50MB</div>
                </>
              )}
            </div>

            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => handleFile(e.target.files && e.target.files[0])}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
              }}
              aria-label="Upload audio or video"
            />

            {previewError && <div style={{ color: "#ff7b7b", marginTop: 8 }}>{previewError}</div>}
          </div>
        )}
      </div>

      {genError && (
        <div role="alert" style={{ color: "#ff7b7b", marginBottom: 8 }}>
          {genError}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating || (mode === "url" ? !preview || previewLoading : !file)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border: "none",
          background: isGenerating ? "#334155" : "linear-gradient(90deg,#8b5cf6,#ec4899)",
          color: "white",
          fontWeight: 800,
          cursor: isGenerating ? "not-allowed" : "pointer",
        }}
        aria-disabled={isGenerating}
      >
        {isGenerating ? "Processing AI Variations…" : "Generate Copyright-Free Options"}
      </button>

      {results && results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ color: "#d1d5db", marginBottom: 12 }}>AI Generated Variations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  background: "#0b1220",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #111827",
                }}
              >
                <button
                  onClick={() => togglePlay(r.stream_url)}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#8b5cf6",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    cursor: "pointer",
                  }}
                  aria-label={playingUrl === r.stream_url ? "Pause" : "Play"}
                >
                  {playingUrl === r.stream_url ? <FaPause /> : <FaPlay />}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ color: "white", fontWeight: 700 }}>{r.title}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>{r.description}</div>
                </div>

                <a
                  href={r.stream_url}
                  download={`${r.title}.mp3`}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#374151",
                    color: "white",
                    textDecoration: "none",
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <FaDownload /> Save
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
