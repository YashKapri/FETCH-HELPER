import React, { useState } from "react";
import { FaMagic, FaUpload, FaSpinner, FaDownload, FaVideo } from "react-icons/fa";

export default function AiVideoEnhancer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedVideoUrl, setEnhancedVideoUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleEnhance = async () => {
    if (!selectedFile) return alert("Please select a video file first.");
    
    setIsEnhancing(true);
    setEnhancedVideoUrl(null);
    setErrorMsg(null);
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        // Call your backend endpoint (which forwards to Colab)
        const response = await fetch("/api/enhance-video", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: "Enhancement failed" }));
            throw new Error(err.detail || "Enhancement failed");
        }

        // Create a blob URL to play/download the result
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setEnhancedVideoUrl(url);
        
    } catch (err) {
        setErrorMsg(err.message);
    } finally {
        setIsEnhancing(false);
    }
  };

  return (
    <div style={{ padding: "10px" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <FaVideo style={{ color: "#10b981" }} /> AI Video Enhancer
      </h2>

      {/* UPLOAD AREA */}
      <div style={{ 
        border: "2px dashed #374151", padding: 30, borderRadius: 12, 
        textAlign: "center", marginBottom: 20, background: "#1f2937" 
      }}>
        <div style={{ color: "#9ca3af", marginBottom: 15 }}>
            <FaMagic size={40} style={{ color: "#10b981", marginBottom: 10 }} />
            <p>Upload low-res video to upscale to 4K (Real-ESRGAN)</p>
        </div>

        <input 
            type="file" 
            accept="video/*" 
            id="video-upload"
            style={{ display: "none" }}
            onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        
        {selectedFile ? (
            <div style={{ color: "#10b981", fontWeight: "bold" }}>
                Selected: {selectedFile.name}
            </div>
        ) : (
            <label 
                htmlFor="video-upload" 
                style={{ 
                    padding: "10px 20px", background: "#374151", color: "white", 
                    borderRadius: 8, cursor: "pointer", display: "inline-block"
                }}
            >
                Choose Video File
            </label>
        )}
      </div>

      {/* ENHANCE BUTTON */}
      <button 
        onClick={handleEnhance}
        disabled={isEnhancing || !selectedFile}
        style={{ 
            width: "100%", padding: "14px", background: isEnhancing ? "#064e3b" : "#10b981", 
            color: "white", fontWeight: "bold", border: "none", borderRadius: "8px", 
            cursor: isEnhancing ? "wait" : "pointer", fontSize: "16px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
        }}
      >
        {isEnhancing ? <><FaSpinner className="spin" /> Processing on Cloud GPU...</> : <><FaUpload /> Enhance Video</>}
      </button>

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div style={{ 
            marginTop: 20, padding: 15, background: "rgba(239, 68, 68, 0.1)", 
            border: "1px solid #ef4444", borderRadius: 8, color: "#f87171" 
        }}>
            Error: {errorMsg}
        </div>
      )}

      {/* RESULT PREVIEW */}
      {enhancedVideoUrl && (
        <div style={{ marginTop: 30, background: "#064e3b", padding: 20, borderRadius: 12, border: "1px solid #10b981" }}>
            <h3 style={{ color: "white", marginTop: 0 }}>✨ Enhanced Result</h3>
            <video controls src={enhancedVideoUrl} style={{ width: "100%", borderRadius: 8, marginBottom: 15 }} />
            
            <a 
                href={enhancedVideoUrl} 
                download={`enhanced_${selectedFile?.name || "video.mp4"}`}
                style={{ 
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "12px", background: "#10b981", color: "white", textDecoration: "none", 
                    borderRadius: 8, fontWeight: "bold"
                }}
            >
                <FaDownload /> Download Enhanced Video
            </a>
        </div>
      )}
    </div>
  );
}