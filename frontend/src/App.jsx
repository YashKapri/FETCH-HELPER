// src/App.jsx
import React, { useState } from "react";
import Header from "./components/Header";
import AiTools from "./components/AiTools";
import AiVideoEnhancer from "./components/AiVideoEnhancer";
import "./index.css";

const TABS = [
  { id: "downloader", label: "Video Downloader" },
  { id: "ai", label: "AI Music Tool" },
  { id: "enhancer", label: "AI Video Enhancer" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("downloader");

  return (
    <div style={{ minHeight: "100vh", background: "#071021", color: "#e6eef8", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Header title="Media Studio" subtitle="Downloader • AI Music • Video Enhancer" />
      <div style={{ maxWidth: 1100, margin: "20px auto 40px", display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: activeTab === t.id ? "linear-gradient(90deg,#3b82f6,#8b5cf6)" : "rgba(255,255,255,0.03)",
                color: activeTab === t.id ? "white" : "#9aa6b8",
                fontWeight: 700,
                boxShadow: activeTab === t.id ? "0 8px 24px rgba(59,130,246,0.12)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", borderRadius: 16, padding: 20 }}>
          {activeTab === "downloader" && (
            <div style={{ padding: 20 }}>
              <h2 style={{ margin: 0 }}>Fetch</h2>
              <p style={{ color: "#9aa6b8" }}>Paste link (YouTube, Instagram, Imgur)...</p>
              <div style={{ display: "flex", gap: 12 }}>
                <input placeholder="Paste link (YouTube, Instagram, Imgur)..." style={{ flex: 1, padding: 12, borderRadius: 10, background: "#0b1220", border: "1px solid rgba(255,255,255,0.03)", color: "white" }} />
                <button style={{ padding: "10px 18px", background: "#3b82f6", color: "white", borderRadius: 10, border: "none" }}>Download</button>
              </div>
            </div>
          )}

          {activeTab === "ai" && <AiTools />}

          {activeTab === "enhancer" && <AiVideoEnhancer />}
        </div>
      </div>
    </div>
  );
}
