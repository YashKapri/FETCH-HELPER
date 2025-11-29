import React, { useState, useEffect, useRef } from "react";
import useDownload from "../hooks/useDownload";
import { FaYoutube, FaInstagram, FaTiktok, FaVideo, FaGlobeAmericas, FaFacebook, FaTwitter, FaPlay } from "react-icons/fa";
import { SiYoutubeshorts } from "react-icons/si"; 

function PreviewCard({ preview }) {
  if (!preview) return null;
  const [imgError, setImgError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { 
    setImgError(false); 
    setIsPlaying(false); 
  }, [preview]);

  const heightsText = Array.isArray(preview.available_heights) && preview.available_heights.length
    ? preview.available_heights.join(", ")
    : "Best Quality";

  // --- ICON & COLOR LOGIC ---
  let PlatformIcon = FaGlobeAmericas;
  let brandColor = "#3b82f6";
  let platformLabel = preview.platform || "Web";
  let typeLabel = preview.content_type || "Video";

  const pLower = platformLabel.toLowerCase();
  if (pLower.includes("youtube")) {
    brandColor = "#FF0000";
    PlatformIcon = FaYoutube;
    if (typeLabel === "Shorts") PlatformIcon = SiYoutubeshorts;
  } else if (pLower.includes("instagram")) {
    brandColor = "#E1306C";
    PlatformIcon = FaInstagram;
  } else if (pLower.includes("tiktok")) {
    brandColor = "#000000";
    PlatformIcon = FaTiktok;
  } else if (pLower.includes("facebook")) {
    brandColor = "#1877F2";
    PlatformIcon = FaFacebook;
  } else if (pLower.includes("twitter") || pLower.includes("x (twitter)")) {
    brandColor = "#1DA1F2";
    PlatformIcon = FaTwitter;
  } else if (pLower.includes("imgur")) {
    brandColor = "#1bb76e";
    PlatformIcon = FaVideo;
  }

  const proxyThumbnailUrl = preview.thumbnail
    ? `/api/proxy-image?url=${encodeURIComponent(preview.thumbnail)}`
    : null;
  
  const isYouTube = pLower.includes("youtube");
  const videoStreamUrl = preview.direct_url 
    ? `/api/proxy-video?url=${encodeURIComponent(preview.direct_url)}`
    : null;

  return (
    <div style={{
      marginTop: 20,
      background: "#1f2937",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid #374151",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
    }}>
      {/* HEADER */}
      <div style={{ 
        background: `linear-gradient(90deg, ${brandColor}20, transparent)`, 
        padding: "8px 16px",
        borderBottom: "1px solid #374151",
        display: "flex", alignItems: "center", gap: 8
      }}>
        <PlatformIcon size={20} color={brandColor} />
        <span style={{ color: brandColor, fontWeight: "bold", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.5px" }}>
          {platformLabel} • {typeLabel}
        </span>
      </div>

      <div style={{ padding: 16, display: "flex", gap: 16, flexDirection: "column" }}>
        
        {/* PLAYER AREA */}
        <div style={{ 
          position: "relative", 
          width: "100%", 
          aspectRatio: "16/9", 
          borderRadius: 12, 
          overflow: "hidden",
          background: "#111827",
          border: "1px solid #374151"
        }}>
          
          {isPlaying ? (
            // --- VIDEO PLAYER MODE ---
            isYouTube ? (
              // Added mute=1 to fix infinite loading
              <iframe 
                src={`https://www.youtube.com/embed/${preview.id}?autoplay=1&mute=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%" }}
              ></iframe>
            ) : (
              <video 
                src={videoStreamUrl} 
                controls 
                autoPlay 
                style={{ width: "100%", height: "100%" }}
              >
                Your browser does not support the video tag.
              </video>
            )
          ) : (
            // --- THUMBNAIL MODE ---
            <div 
              onClick={() => setIsPlaying(true)}
              style={{ width: "100%", height: "100%", cursor: "pointer", position: "relative" }}
            >
               {!imgError && proxyThumbnailUrl ? (
                <img
                  src={proxyThumbnailUrl}
                  alt="thumbnail"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <PlatformIcon size={64} color={brandColor} style={{ opacity: 0.2 }} />
                </div>
              )}
              
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 64, height: 64,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid rgba(255,255,255,0.8)", backdropFilter: "blur(4px)"
              }}>
                <FaPlay size={24} color="white" style={{ marginLeft: 4 }} />
              </div>
              
              <div style={{
                position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.85)",
                color: "white", fontSize: "12px", fontWeight: "bold", padding: "4px 8px", borderRadius: 6
              }}>
                {preview.duration_text || "00:00"}
              </div>
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ 
            fontWeight: 700, fontSize: 18, color: "#f3f4f6", lineHeight: "1.4"
          }}>
            {preview.title || "Untitled Video"}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 14 }}>
            by <span style={{ color: "#d1d5db", fontWeight: "600" }}>{preview.uploader || "Unknown"}</span>
          </div>
          <div style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>
            Available Qualities: {heightsText}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TabLayout() {
  const { startDownload, isDownloading } = useDownload();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!url.trim()) {
      setPreview(null); setPreviewError(null); setLoadingPreview(false); return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(url), 500);
    return () => clearTimeout(debounceRef.current);
  }, [url]);

  async function fetchPreview(targetUrl) {
    if (!targetUrl) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const resp = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Server error");

      let duration_text = "0:00";
      if (typeof data.duration === "number") {
        const mins = Math.floor(data.duration / 60);
        const secs = Math.floor(data.duration % 60);
        duration_text = `${mins}:${secs.toString().padStart(2, "0")}`;
      }

      setPreview({
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        uploader: data.uploader,
        duration: data.duration,
        duration_text: duration_text,
        available_heights: data.available_heights || [],
        platform: data.platform,    
        content_type: data.content_type,
        direct_url: data.direct_url 
      });
    } catch (err) {
      setPreview(null);
      let msg = err.message || "Invalid URL";
      if (msg.includes("ERROR:")) msg = msg.split("ERROR:")[1].substring(0, 100) + "...";
      setPreviewError(msg);
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleDownloadClick() {
    if (!url.trim()) { alert("Please paste a URL first."); return; }
    startDownload(url); 
  }

  return (
    <div>
      <div className="tab-box" style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <input
          className="input"
          placeholder="Paste link (YouTube, Instagram, Imgur)..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ padding: "14px", borderRadius: 8, border: "1px solid #374151", flex: 1, background: "#1f2937", color: "white" }}
        />
        <button 
          className="btn" 
          onClick={handleDownloadClick} 
          disabled={!preview || isDownloading}
          style={{ 
            opacity: (preview && !isDownloading) ? 1 : 0.6, 
            cursor: (preview && !isDownloading) ? 'pointer' : 'not-allowed', 
            fontWeight: "bold", padding: "0 24px", minWidth: "120px"
          }}
        >
          {isDownloading ? "Saving..." : "Download"}
        </button>
      </div>

      {loadingPreview && (
        <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontStyle: "italic" }}>
          Searching metadata...
        </div>
      )}

      {previewError && !loadingPreview && (
        <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", color: "#f87171", borderRadius: 8, fontSize: 13, textAlign: "center" }}>
          {previewError}
        </div>
      )}

      <PreviewCard preview={preview} />
    </div>
  );
}