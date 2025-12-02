# Fetch Helper – Media Studio

Media Studio is a full-stack application that combines a universal video downloader, an AI music generator, and an AI video enhancer. It lets users fetch, preview, and download media from major platforms (YouTube, Instagram, TikTok, etc.) and generate copyright-free music using URL input, file upload, or text prompts.

---

## Features

### 1. Video Downloader
- Supports YouTube, TikTok, Instagram, Reddit, and more.
- Extracts metadata, thumbnails, and available formats.
- Downloads audio, video, or both.
- Uses FastAPI + yt-dlp for fast and stable performance.

### 2. AI Music Lab
The AI Music Lab has three modes:

#### • Remix URL  
Generate copyright-free music variations from any YouTube/SoundCloud link.

#### • Upload File  
Upload an audio or video file and generate brand new AI variations.

#### • Text-to-Music  
Describe music in natural language and the system generates a full track using AI.

### 3. AI Video Enhancer
- Upload low-quality footage and upscale it to 1080p or 4K.
- Based on Real-ESRGAN (GPU-accelerated).
- Backend supports forwarding requests to external GPU services like Colab.

### 4. Modern Animated UI
- Built with React + Vite.
- Animated using Framer Motion.
- Optional 3D elements powered by React Three Fiber.
- Smooth transitions, modern dark theme, responsive layout.

---

## Tech Stack

### Frontend
- React (Vite)
- Framer Motion (animations)
- React Three Fiber (optional 3D)
- TailwindCSS / Custom CSS
- React Icons

### Backend
- FastAPI (Python)
- yt-dlp
- Real-ESRGAN (for video enhancement)
- Custom audio pipelines
- Optional remote GPU processing

---

## API Endpoints

### Media Info
