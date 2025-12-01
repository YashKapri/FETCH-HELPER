// src/components/AiTools.jsx
import React, { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Stars } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMagic,
  FaCloudUploadAlt,
  FaPlay,
  FaPause,
  FaDownload,
  FaCheckCircle,
  FaExclamationCircle,
  FaKeyboard,
} from "react-icons/fa";

/**
 * AiTools (animated)
 *
 * - 3 modes: "prompt" (text→music), "url" (remix), "file" (upload)
 * - 3D animated background via @react-three/fiber + drei
 * - Framer Motion animations for UI elements and result cards
 * - Single Audio instance for playback
 * - Drag & drop upload
 *
 * Configure API_PREFIX ("" or "/api") to match your backend.
 * Expects:
 *  POST {API_PREFIX}/info
 *  POST {API_PREFIX}/generate-music
 *  POST {API_PREFIX}/generate-music-prompt
 *  GET  {API_PREFIX}/proxy-image?url=...
 */

const API_PREFIX = ""; // set to "/api" if needed

// --- Small 3D sphere "core" that reacts when generating ---
function AiCore({ active }) {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.rotation.y = t * 0.35;
    ref.current.rotation.x = Math.sin(t * 0.5) * 0.2;
  });
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1}>
      <Sphere args={[1.1, 64, 64]} ref={ref} scale={active ? 1.35 : 1.1}>
        <MeshDistortMaterial
          attach="material"
          distort={active ? 0.7 : 0.28}
          speed={active ? 4.2 : 1.2}
          roughness={0.15}
          metalness={0.9}
          color={active ? "#06b6d4" : "#7c3aed"}
        />
      </Sphere>
    </Float>
  );
}

export default function AiTools() {
  const [mode, setMode] = useState("url"); // "prompt" | "url" | "file"
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [promptText, setPromptText] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [genError, setGenError] = useState("");

  const audioRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);
  const playingRef = useRef(null);

  const debounceRef = useRef(null);
  const dropRef = useRef(null);
  const createdObjectUrls = useRef(new Set());

  // create single audio + cleanup
  useEffect(() => {
    audioRef.current = new Audio();
    const onEnded = () => {
      setPlayingUrl(null);
      playingRef.current = null;
    };
    audioRef.current.addEventListener("ended", onEnded);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", onEnded);
        audioRef.current.src = "";
        audioRef.current = null;
      }
      // revoke any created object urls
      createdObjectUrls.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      createdObjectUrls.current.clear();
      clearTimeout(debounceRef.current);
    };
  }, []);

  // debounce preview fetch
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

  // drag/drop handlers for file uploads
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      stop(e);
      const incoming = e.dataTransfer?.files?.[0];
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
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        let msg =
          typeof body === "object" && body ? body.detail || JSON.stringify(body) : String(body || "Preview not available");
        if (typeof msg === "string" && msg.includes("ERROR:")) msg = msg.split("ERROR:").pop().trim();
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

  function handleFile(incomingFile) {
    if (!incomingFile) return;
    const mime = incomingFile.type || "";
    if (!mime.startsWith("audio/") && !mime.startsWith("video/")) {
      setPreviewError("Unsupported file type. Upload audio or video.");
      return;
    }
    if (incomingFile.size > 100 * 1024 * 1024) {
      // allow a bit bigger for more realistic enhancer usage
      setPreviewError("File too large — max 100MB.");
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

  // Core generate handler supporting 3 modes
  async function handleGenerate() {
    setGenError("");
    setResults([]);
    setIsGenerating(true);

    try {
      // PROMPT mode -> dedicated prompt endpoint returning audio blob
      if (mode === "prompt") {
        if (!promptText.trim()) {
          setGenError("Please enter a prompt.");
          setIsGenerating(false);
          return;
        }
        const form = new FormData();
        form.append("prompt", promptText.trim());

        const res = await fetch(`${API_PREFIX}/generate-music-prompt`, { method: "POST", body: form });
        if (!res.ok) {
          const ct = res.headers.get("content-type") || "";
          const body = ct.includes("application/json") ? await res.json() : await res.text();
          const msg = typeof body === "object" ? body.detail || JSON.stringify(body) : String(body || "Generation failed");
          throw new Error(msg);
        }
        const blob = await res.blob();
        const urlObj = URL.createObjectURL(blob);
        createdObjectUrls.current.add(urlObj);
        const title = promptText.length > 60 ? promptText.slice(0, 60) + "…" : promptText;
        setResults([
          {
            title: `Prompt: ${title}`,
            description: "Generated from text prompt",
            stream_url: urlObj,
            downloadable_blob: blob,
            is_prompt_result: true,
          },
        ]);
        return;
      }

      // URL mode -> backend generate-music
      if (mode === "url") {
        if (!preview) {
          setGenError("Wait for the preview to load before generating.");
          setIsGenerating(false);
          return;
        }
        const form = new FormData();
        form.append("url", url.trim());
        const res = await fetch(`${API_PREFIX}/generate-music`, { method: "POST", body: form });
        if (!res.ok) {
          const ct = res.headers.get("content-type") || "";
          const body = ct.includes("application/json") ? await res.json() : await res.text();
          const msg = typeof body === "object" ? body.detail || JSON.stringify(body) : String(body || "Generation failed");
          throw new Error(msg);
        }
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
        return;
      }

      // FILE mode -> upload to generate-music
      if (mode === "file") {
        if (!file) {
          setGenError("Please select a file to upload.");
          setIsGenerating(false);
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_PREFIX}/generate-music`, { method: "POST", body: form });
        if (!res.ok) {
          const ct = res.headers.get("content-type") || "";
          const body = ct.includes("application/json") ? await res.json() : await res.text();
          const msg = typeof body === "object" ? body.detail || JSON.stringify(body) : String(body || "Generation failed");
          throw new Error(msg);
        }
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
        return;
      }
    } catch (err) {
      setGenError(err?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  // Play/pause a track (handles object URLs and server stream_urls)
  async function togglePlay(streamUrl) {
    if (!audioRef.current) return;
    try {
      if (playingRef.current === streamUrl) {
        audioRef.current.pause();
        setPlayingUrl(null);
        playingRef.current = null;
        return;
      }
      audioRef.current.pause();
      audioRef.current.src = streamUrl;
      await audioRef.current.play();
      setPlayingUrl(streamUrl);
      playingRef.current = streamUrl;
    } catch (err) {
      console.warn("Playback error", err);
      setGenError("Playback failed. Try downloading the file.");
    }
  }

  // small helper to render a colorful action button with icon
  const ActionButton = ({ onClick, disabled, children, icon }) => (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 14,
        borderRadius: 12,
        border: "none",
        background: disabled ? "#334155" : "linear-gradient(90deg,#8b5cf6,#06b6d4)",
        color: "white",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {icon} {children}
    </motion.button>
  );

  return (
    <div style={{ position: "relative", padding: 20, minHeight: 540, overflow: "hidden" }}>
      {/* 3D BACKGROUND */}
      <div style={{ position: "absolute", left: 0, right: 0, top: -20, height: 340, zIndex: 0, pointerEvents: "none", opacity: 0.9 }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={null}>
            <AiCore active={isGenerating} />
            <Stars radius={60} depth={30} count={800} factor={6} saturation={0} fade speed={isGenerating ? 1.6 : 0.6} />
          </Suspense>
        </Canvas>
      </div>

      {/* FOREGROUND UI */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>
            D
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "white" }}>AI Music Lab</h2>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>Generate creative AI-style variations or synthesize music from text.</div>
          </div>
        </div>

        {/* mode toggles */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => { setMode("prompt"); setFile(null); setResults([]); setGenError(""); setPreviewError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: mode === "prompt" ? "#06b6d4" : "rgba(255,255,255,0.03)", color: "white", fontWeight: 700 }}>
            <FaKeyboard style={{ marginRight: 8 }} /> Text to Music
          </button>
          <button onClick={() => { setMode("url"); setFile(null); setResults([]); setGenError(""); setPreviewError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: mode === "url" ? "#7c3aed" : "rgba(255,255,255,0.03)", color: "white", fontWeight: 700 }}>
            Remix URL
          </button>
          <button onClick={() => { setMode("file"); setUrl(""); setResults([]); setGenError(""); setPreviewError(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: mode === "file" ? "#06b6d4" : "rgba(255,255,255,0.03)", color: "white", fontWeight: 700 }}>
            <FaCloudUploadAlt style={{ marginRight: 8 }} /> Upload File
          </button>
        </div>

        {/* input area */}
        <div style={{ marginBottom: 16 }}>
          {mode === "prompt" ? (
            <>
              <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="Describe the music: mood, instruments, tempo, era..." style={{ width: "100%", padding: 14, borderRadius: 12, background: "#0b1220", border: "1px solid rgba(255,255,255,0.03)", color: "white", minHeight: 120, resize: "vertical", fontFamily: "Inter, system-ui, sans-serif" }} />
              <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>Try: "Dreamy synthwave with soft piano and distant thunder — 90 BPM".</div>
            </>
          ) : mode === "url" ? (
            <>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste YouTube, SoundCloud, Instagram link..." onKeyDown={(e) => { if (e.key === "Enter") fetchPreview(url.trim()); }} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#0b1220", border: "1px solid rgba(255,255,255,0.03)", color: "white" }} />
              {previewLoading && <div style={{ color: "#9ca3af", marginTop: 10, fontStyle: "italic" }}>Looking up track info...</div>}
              {previewError && !previewLoading && <div style={{ marginTop: 10, padding: 10, background: "rgba(239,68,68,0.06)", borderRadius: 10, color: "#ffb4b4", display: "flex", gap: 8, alignItems: "center" }}><FaExclamationCircle /> {previewError}</div>}
              {preview && !previewLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.03)" }}>
                  {preview.thumbnail ? <img src={`${API_PREFIX}/proxy-image?url=${encodeURIComponent(preview.thumbnail)}`} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} /> : <div style={{ width: 80, height: 80, borderRadius: 10, background: "#08121a" }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Target Audio Source</div>
                    <div style={{ color: "white", fontWeight: 800, marginTop: 6 }}>{preview.title}</div>
                    <div style={{ color: "#9ca3af", marginTop: 4 }}>{preview.uploader} • {preview.platform}</div>
                  </div>
                  <FaCheckCircle color="#34d399" size={20} />
                </motion.div>
              )}
            </>
          ) : (
            <div ref={dropRef} style={{ border: "2px dashed rgba(255,255,255,0.03)", padding: 28, borderRadius: 12, textAlign: "center", background: "#07121a", position: "relative" }}>
              <input id="audio-upload" type="file" accept="audio/*,video/*" onChange={(e) => handleFile(e.target.files && e.target.files[0])} style={{ display: "none" }} />
              <label htmlFor="audio-upload" style={{ cursor: "pointer", display: "inline-block", padding: "10px 16px", borderRadius: 10, background: "#0b1220", color: "#9ca3af" }}>
                <FaCloudUploadAlt /> &nbsp; Click to choose or drag & drop
              </label>
              {file && <div style={{ marginTop: 10, color: "#a78bfa", fontWeight: 700 }}>{file.name}</div>}
              {previewError && <div style={{ marginTop: 10, color: "#fca5a5" }}>{previewError}</div>}
            </div>
          )}
        </div>

        {/* controls */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <ActionButton onClick={handleGenerate} disabled={isGenerating || (mode === "url" ? (!preview || previewLoading) : mode === "file" ? !file : false)} icon={<FaMagic />}>
            {isGenerating ? (mode === "prompt" ? "AI composing..." : "Processing Variations...") : mode === "prompt" ? "Generate from Prompt" : "Generate Variations"}
          </ActionButton>

          <div style={{ flex: 1 }} />

          <div style={{ color: "#9ca3af", fontSize: 13 }}>{results.length > 0 ? `${results.length} result(s)` : "No results yet"}</div>
        </div>

        {genError && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(239,68,68,0.06)", color: "#ffb4b4" }}>{genError}</div>}

        {/* results */}
        <AnimatePresence>
          {results && results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 18 }}>
              <h3 style={{ color: "#d1d5db", marginBottom: 12 }}>AI Generated Variations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "linear-gradient(180deg,#07121a,#08121a)", border: "1px solid rgba(255,255,255,0.02)" }}>
                    <button onClick={() => togglePlay(r.stream_url)} style={{ width: 52, height: 52, borderRadius: "50%", background: playingUrl === r.stream_url ? "#06b6d4" : "#7c3aed", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {playingUrl === r.stream_url ? <FaPause /> : <FaPlay />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 800 }}>{r.title}</div>
                      <div style={{ color: "#9ca3af", fontSize: 13 }}>{r.description || (r.is_prompt_result ? "Generated from your prompt" : "AI remix")}</div>
                    </div>

                    <a href={r.stream_url} download={`${(r.title || "ai_result").replace(/\s+/g, "_")}.mp3`} onClick={() => { /* leave object URLs alive for playback; they'll be revoked on unmount */ }} style={{ padding: "8px 12px", borderRadius: 10, background: "#0b1220", color: "#9ca3af", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <FaDownload /> Save
                    </a>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
