import { useState } from 'react';

export default function useDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const startDownload = async (url) => {
    if (!url) return;
    setIsDownloading(true);

    try {
      // 1. Call the backend via the proxy (No http://localhost:8000)
      const resp = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url: url,
          mode: "both",           // Default to best video+audio
          preferred_resolution: 1080 
        })
      });

      if (!resp.ok) {
        // Try to read the error message from the server
        let errMsg = "Download failed";
        try {
          const errJson = await resp.json();
          errMsg = errJson.detail || errMsg;
        } catch (e) {
          errMsg = await resp.text();
        }
        throw new Error(errMsg);
      }

      // 2. The backend returns the file directly (Blob)
      const blob = await resp.blob();
      
      // 3. Create a temporary link to trigger the browser's save dialog
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Try to guess extension, default to mp4
      link.download = "video.mp4"; 
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error("Download error:", err);
      alert("Error: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return { startDownload, isDownloading };
}