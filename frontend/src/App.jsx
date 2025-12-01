// App.jsx (merged)
// Base: your App.jsx with added "Enhancer" tab + AiVideoEnhancer import
import React, { useState } from "react";
import TabLayout from "./components/TabLayout";
import AiTools from "./components/AiTools";
import AiVideoEnhancer from "./components/AiVideoEnhancer"; // <--- ensure this file exists
import "./index.css";

const TABS = [
  { id: "downloader", label: "Video Downloader" },
  { id: "ai", label: "AI Music Tool" },
  { id: "enhancer", label: "AI Video Enhancer" }, // Added enhancer tab
];

export default function App() {
  const [activeTab, setActiveTab] = useState("downloader");

  // Dynamic header/title helpers
  const getHeaderTitle = () => {
    if (activeTab === "downloader") return "Downloader";
    if (activeTab === "ai") return "Media Studio";
    if (activeTab === "enhancer") return "Video Enhancer";
    return "Media Studio";
  };

  const getSubtitle = () => {
    if (activeTab === "downloader") return "Download video & audio in the quality you want.";
    if (activeTab === "ai") return "Generate creative AI-style music variations from any audio.";
    if (activeTab === "enhancer") return "Upscale and enhance videos using AI technology.";
    return "";
  };

  return (
    <div className="container">
      {/* HEADER */}
      <header className="header" role="banner">
        <div className="logo">D</div>

        <div>
          <div className="title">
            {getHeaderTitle()}
          </div>
          <div className="subtitle">
            {getSubtitle()}
          </div>
        </div>
      </header>

      {/* PRIMARY NAVIGATION (TABS) */}
      <nav
        className="nav-tabs"
        aria-label="Main sections"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${isActive ? "nav-tab--active" : ""}`}
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* MAIN CONTENT */}
      <main>
        <section
          className="card"
          aria-labelledby="section-heading"
        >
          <h2
            id="section-heading"
            style={{ margin: 0, marginBottom: 12 }}
          >
            {activeTab === "downloader" && "Fetch"}
            {activeTab === "ai" && "AI Music Lab"}
            {activeTab === "enhancer" && "Enhance Video"}
          </h2>

          {/* Component switcher */}
          {activeTab === "downloader" && <TabLayout />}
          {activeTab === "ai" && <AiTools />}
          {activeTab === "enhancer" && <AiVideoEnhancer />}
        </section>
      </main>
    </div>
  );
}
