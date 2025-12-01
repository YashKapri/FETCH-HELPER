// src/components/AiVideoEnhancer.jsx
import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { FaCloudUploadAlt, FaUpload, FaSpinner, FaDownload } from "react-icons/fa";
import AiCore3D from "./AiCore3D";

/**
 * AiVideoEnhancer: visually rich enhancer using a small three.js canvas background,
 * drag/drop, simulated progress, and final download blob handling.
 *
 * If your backend uses /api prefix, update the fetch path.
 */

export default function AiVideoEnhancer() {
  const [file, setFile] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  useEffect(() => {
    let t;
    if (isEnhancing) {
      setProgress(6);
      t = setInterval(() => {
        setProgress((p) => Math.min(98, p + Math.random() * 12));
      }, 800);
    } else {
      setProgress(0);
    }
    return () => clearInterval(t);
  }, [isEnhancing]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        try { URL.revokeObjectURL(resultUrl); } catch (e) {}
      }
    };
  }, [resultUrl]);

  async function handleEnhance() {
    if (!file) return alert("Choose a video file first.");
    setIsEnhancing(true);
    setResultUrl(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      // If backend is async, you should implement job/poll flow — this is immediate attempt
      const res = await fetch("/api/enhance-video", { method: "POST", body: fd });
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        const b = ct.includes("application/json") ? await res.json() : await res.text();
        throw new Error(typeof b === "object" ? b.detail || JSON.stringify(b) : String(b || "Enhance failed"));
      }
      const blob = await res.blob();

      // Fake finishing progress for smooth UX
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err) {
      alert("Enhancer error: " + (err.message || err));
    } finally {
      setIsEnhancing(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, alignItems: "start" }}>
      <div style={{ position: "relative", height: 260, borderRadius: 16, overflow: "hidden", background: "linear-gradient(180deg,#041021,#071827)" }}>
        <Canvas style={{ position: "absolute", inset: 0 }} camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 5, 2]} intensity={1} />
          <AiCore3D active={isEnhancing} />
          <Stars radius={50} depth={40} count={500} factor={4} saturation={0} fade speed={1} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={isEnhancing ? 1.2 : 0.2} />
        </Canvas>

        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", background: "rgba(2,6,23,0.55)", borderRadius: 12, padding: 18, width: "86%", textAlign: "center", color: "white" }}>
            <h3 style={{ margin: 0 }}>AI Video Enhancer</h3>
            <p style={{ margin: "8px 0 0", color: "#9aa6b8" }}>Upscale footage using cloud GPU (simulate Real-ESRGAN).</p>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="vfile" style={{ display: "block", cursor: "pointer" }}>
            <input id="vfile" type="file" accept="video/*" style={{ display: "none" }} ref={fileRef} onChange={(e) => setFile(e.target.files && e.target.files[0])} />
            <div style={{ padding: 18, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.04)", background: "#07121a", textAlign: "center" }}>
              <FaCloudUploadAlt size={28} style={{ marginBottom: 6 }} />
              <div style={{ color: file ? "#a7f3d0" : "#9aa6b8", fontWeight: 700 }}>{file ? file.name : "Click to choose or drag & drop a video"}</div>
              <div style={{ color: "#7f8a93", marginTop: 8, fontSize: 13 }}>Accepts mp4, mov — try a short clip (recommended)</div>
            </div>
          </label>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={handleEnhance} disabled={isEnhancing || !file} style={{ flex: 1, padding: 12, background: file ? "#06b6d4" : "#334155", color: "white", borderRadius: 10, border: "none", fontWeight: 700 }}>
              {isEnhancing ? <><FaSpinner style={{ marginRight: 8, animation: "spin 1s linear infinite" }} /> Enhancing...</> : <><FaUpload style={{ marginRight: 8 }} /> Enhance</>}
            </button>
            {resultUrl && <a href={resultUrl} download={`enhanced_${file?.name || "video.mp4"}`} style={{ padding: 12, background: "#10b981", color: "white", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}><FaDownload /> Download</a>}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ height: 10, background: "#07121a", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.02)" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#06b6d4,#6366f1)", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ color: "#9aa6b8", marginTop: 6, fontSize: 13 }}>{isEnhancing ? `Processing ${Math.round(progress)}%` : (resultUrl ? "Complete" : "Idle")}</div>
          </div>
        </div>

        <div style={{ width: 320 }}>
          <div style={{ padding: 12, borderRadius: 12, background: "#071827", border: "1px solid rgba(255,255,255,0.02)" }}>
            <h4 style={{ margin: "0 0 6px 0" }}>Preview</h4>
            {resultUrl ? (
              <video controls src={resultUrl} style={{ width: "100%", borderRadius: 8 }} />
            ) : (
              <div style={{ height: 160, borderRadius: 8, background: "#04121a", display: "grid", placeItems: "center", color: "#9aa6b8" }}>
                <div><FaUpload /> &nbsp; No result yet</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
