import React, { useState } from "react";
import TabLayout from "./components/TabLayout";
import AiTools from "./components/AiTools";
import "./index.css";

const TABS = [
  { id: "downloader", label: "Video Downloader" },
  { id: "ai", label: "AI Music Tool" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("downloader");

  const isDownloader = activeTab === "downloader";

  return (
    <div className="container">
      {/* HEADER */}
      <header className="header" role="banner">
        <div className="logo">D</div>

        <div>
          <div className="title">
            {isDownloader ? "Downloader" : "Media Studio"}
          </div>
          <div className="subtitle">
            {isDownloader
              ? "Download video & audio in the quality you want."
              : "Generate creative AI-style music variations from any audio."}
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
          aria-labelledby="downloader-heading"
        >
          <h2
            id="downloader-heading"
            style={{ margin: 0, marginBottom: 12 }}
          >
            {isDownloader ? "Fetch" : "AI Music Lab"}
          </h2>

          {isDownloader ? <TabLayout /> : <AiTools />}
        </section>
      </main>
    </div>
  );
}
