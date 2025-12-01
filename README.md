# 🎬Fetch helper

**Media Studio** is a powerful, full-stack web application that combines a universal video downloader with an AI-powered music generation tool. It allows users to fetch, preview, and download media from major platforms (YouTube, Instagram, TikTok, etc.) and transform audio tracks into copyright-free variations using digital signal processing.

✨ Features

### 📥 Video Downloader
* **Universal Support:** Downloads videos and audio from YouTube, Instagram, TikTok, Facebook, Twitter (X), Imgur, and more.
* **Smart Detection:** Automatically detects content types (Shorts, Reels, Clips) and cleans URLs (e.g., removing playlist parameters).
* **Inline Player:** Watch videos directly in the app before downloading.
    * *YouTube:* Uses official embedded player.
    * *Others:* Uses a secure backend proxy to stream content, bypassing hotlink protections.
* **Quality Selection:** Auto-selects the best available video/audio quality (up to 4K).
* **Robust Fetching:** Includes a smart fallback system to handle YouTube cookies and age-restricted content automatically.

### 🎵 AI Music Lab
* **Generate Variations:** Upload an MP3 or paste a song URL to instantly generate 5 unique "Copyright-Free" style variations:
    * 🧘 **Lo-Fi Slow:** Chill, relaxed, and slowed down.
    * ⚡ **Nightcore:** Fast, energetic, and pitch-shifted.
    * 🔊 **Bass Boosted:** Heavy bass for club vibes.
    * 🌌 **Ethereal:** Spacious reverb and echo effects.
    * 🕹️ **8-Bit Retro:** Crunchy, old-school arcade sound.
* **Instant Preview:** Validates song URLs and displays metadata before processing.
* **Audio Processing:** Powered by **FFmpeg** DSP filters on the backend.

---

## 🛠️ Tech Stack

### **Frontend**
* **React (Vite):** Fast, modern UI framework.
* **React Icons:** For a clean, professional look.
* **CSS:** Custom dark-mode styling.

### **Backend**
* **FastAPI (Python):** High-performance API framework.
* **yt-dlp:** The engine behind video extraction and metadata fetching.
* **FFmpeg:** The core processor for merging formats and generating audio effects.
* **Requests:** Handles proxy streaming for images and videos.

---

## 🚀 Installation & Setup

### Prerequisites
1.  **Node.js** (v16+) installed.
2.  **Python** (v3.8+) installed.
3.  **FFmpeg** installed and added to your system PATH.
    * *Windows:* [Download & Install Guide](https://www.gyan.dev/ffmpeg/builds/)
    * *Linux:* `sudo apt install ffmpeg`
    * *Mac:* `brew install ffmpeg`

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/media-studio.git](https://github.com/yourusername/media-studio.git)
cd media-studio
