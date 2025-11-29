# media_studio.py
import logging
import tempfile
import subprocess
import sys
import uuid
import os
import threading
import shutil
import requests
import re
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Body, Response, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from yt_dlp import YoutubeDL
from yt_dlp.utils import UnsupportedError

# local helper: select_formats must be present in .utils
from .utils import select_formats

LOG = logging.getLogger("media_studio")
LOG.setLevel(logging.INFO)

app = FastAPI(title="Media Studio (Merged)")

# Allow CORS during dev; narrow origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"],  # adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- REGISTRY (Processes & Temp Files) ----------
PROCESS_REGISTRY: Dict[str, Dict[str, Any]] = {}
PROCESS_REGISTRY_LOCK = threading.Lock()


def _register_process(download_id: str, proc: subprocess.Popen):
    with PROCESS_REGISTRY_LOCK:
        entry = PROCESS_REGISTRY.setdefault(download_id, {"processes": [], "tmpfiles": [], "lock": threading.Lock()})
        entry["processes"].append(proc)


def _register_tmpfile(download_id: str, path: str):
    with PROCESS_REGISTRY_LOCK:
        entry = PROCESS_REGISTRY.setdefault(download_id, {"processes": [], "tmpfiles": [], "lock": threading.Lock()})
        entry["tmpfiles"].append(path)


def _cleanup_registry(download_id: str):
    with PROCESS_REGISTRY_LOCK:
        entry = PROCESS_REGISTRY.pop(download_id, None)
    if not entry:
        return
    for p in entry.get("processes", []):
        try:
            if p.poll() is None:
                p.kill()
        except Exception:
            pass
    for f in entry.get("tmpfiles", []):
        try:
            if os.path.exists(f):
                try:
                    if os.path.isdir(f):
                        shutil.rmtree(f, ignore_errors=True)
                    else:
                        os.remove(f)
                except Exception:
                    pass
        except Exception:
            pass


def _kill_processes(download_id: str):
    killed = []
    with PROCESS_REGISTRY_LOCK:
        entry = PROCESS_REGISTRY.get(download_id)
        if not entry:
            return killed
        procs = list(entry.get("processes", []))
    for p in procs:
        try:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=2)
                except Exception:
                    pass
                if p.poll() is None:
                    p.kill()
                if p.poll() is not None:
                    try:
                        killed.append(p.pid)
                    except Exception:
                        pass
        except Exception:
            pass
    _cleanup_registry(download_id)
    return killed


# ---------- MODELS ----------
class DownloadRequest(BaseModel):
    url: str
    mode: str
    preferred_resolution: Optional[int] = 1080
    download_id: Optional[str] = None


# ---------- HELPERS ----------
def _clean_url(url: str) -> str:
    """Safely remove youtube playlist/mix params while leaving other URLs intact."""
    try:
        if not url:
            return url
        if "youtube.com" in url or "youtu.be" in url:
            url = re.sub(r"([&?])list=[^&]+", "", url)
            url = re.sub(r"([&?])index=[^&]+", "", url)
            url = re.sub(r"([&?])feature=[^&]+", "", url)
            url = url.replace("watch&", "watch?")
            url = re.sub(r"[&?]+$", "", url)
    except Exception:
        return url
    return url


def _extract_info_with_cookie_fallback(ydl_opts: dict, url: str):
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if isinstance(info, dict) and info.get("entries"):
                return info["entries"][0]
            return info
    except Exception as e:
        msg = str(e)
        if "Could not copy Chrome cookie database" in msg or "Permission denied" in msg:
            LOG.warning("Chrome cookies locked. Retrying without cookies...")
            fallback_opts = dict(ydl_opts)
            fallback_opts.pop("cookiesfrombrowser", None)
            fallback_opts.pop("cookiefile", None)
            try:
                with YoutubeDL(fallback_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    if isinstance(info, dict) and info.get("entries"):
                        return info["entries"][0]
                    return info
            except UnsupportedError:
                raise HTTPException(status_code=400, detail="This website is not currently supported.")
            except Exception as e2:
                if "Unsupported URL" in str(e2):
                    raise HTTPException(status_code=400, detail="This website is not currently supported.")
                raise e2
        if "Unsupported URL" in msg:
            raise HTTPException(status_code=400, detail="This website is not currently supported.")
        raise e


def _detect_content_type(url: str, info: dict):
    extractor = info.get("extractor_key") or info.get("extractor") or "Web"
    platform = extractor.replace(":", " ").title()
    content_type = "Video"
    webpage_url = info.get("webpage_url", url).lower()
    domain = platform.lower()

    if "youtube" in domain:
        platform = "YouTube"
        content_type = "Shorts" if "/shorts/" in webpage_url else "Video"
    elif "instagram" in domain:
        platform = "Instagram"
        content_type = "Reels" if "/reel" in webpage_url else "Post"
    elif "tiktok" in domain:
        platform = "TikTok"
    elif "twitter" in domain or domain == "x":
        platform = "X (Twitter)"
    elif "facebook" in domain:
        platform = "Facebook"
    elif "imgur" in domain:
        platform = "Imgur"
        content_type = "Clip"

    return platform, content_type


def _run_ffmpeg_filter(input_path: str, output_path: str, filter_complex: str, download_id: str):
    cmd = ["ffmpeg", "-y", "-i", input_path, "-af", filter_complex, "-vn", output_path]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    _register_process(download_id, p)
    stdout, stderr = p.communicate()
    if p.returncode != 0:
        msg = stderr.decode(errors="ignore")[:1000]
        raise RuntimeError(f"ffmpeg filter failed: {msg}")
    _register_tmpfile(download_id, output_path)


# ---------- ENDPOINTS ----------
@app.post("/info")
async def info_endpoint(payload: dict = Body(...)):
    raw_url = (payload.get("url") or "").strip()
    LOG.info("Incoming /info raw_url=%s", raw_url)
    if not raw_url:
        raise HTTPException(status_code=400, detail="Missing url")
    url = _clean_url(raw_url)
    LOG.info("Using cleaned URL: %s", url)
    cookie_file = "cookies.txt"

    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "force_ipv4": True,
            "cookiesfrombrowser": ("chrome",),
        }
        if os.path.exists(cookie_file):
            ydl_opts["cookiefile"] = cookie_file

        info = _extract_info_with_cookie_fallback(ydl_opts, url)
        platform, content_type = _detect_content_type(url, info)

        formats = info.get("formats") or []
        best_mp4 = None
        for f in formats:
            if f.get("vcodec") != "none" and f.get("acodec") != "none":
                best_mp4 = f.get("url") or best_mp4
        direct_url = best_mp4 if best_mp4 else info.get("url")

        heights = set()
        for f in formats:
            h = f.get("height")
            try:
                if h:
                    heights.add(int(h))
            except Exception:
                pass
        possible = sorted([q for q in [2160, 1440, 1080, 720, 480, 360, 240] if q in heights], reverse=True)

        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "uploader": info.get("uploader") or info.get("uploader_id"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "available_heights": possible,
            "platform": platform,
            "content_type": content_type,
            "direct_url": direct_url,
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        LOG.exception("info error")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/proxy-image")
def proxy_image_endpoint(url: str):
    if not url:
        return Response(status_code=404)
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = requests.get(url, headers=headers, stream=True, timeout=10)
        if resp.status_code == 200:
            return Response(content=resp.content, media_type="image/jpeg")
        return Response(status_code=404)
    except Exception:
        return Response(status_code=404)


@app.post("/generate-music")
async def generate_music(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    if not url and not file:
        raise HTTPException(status_code=400, detail="Provide a URL or File")

    job_id = f"gen_{uuid.uuid4().hex}"
    tmpdir = Path(tempfile.gettempdir()) / "fetch_helper_ai"
    tmpdir.mkdir(parents=True, exist_ok=True)
    input_path = tmpdir / f"{job_id}_input.mp3"

    try:
        if file:
            with open(input_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            _register_tmpfile(job_id, str(input_path))
        else:
            clean_url = _clean_url(url)
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": str(input_path),
                "quiet": True,
                "no_warnings": True,
                "cookiesfrombrowser": ("chrome",),
            }
            if os.path.exists("cookies.txt"):
                ydl_opts["cookiefile"] = "cookies.txt"

            try:
                with YoutubeDL(ydl_opts) as ydl:
                    ydl.download([clean_url])
            except Exception:
                if "cookiesfrombrowser" in ydl_opts: del ydl_opts["cookiesfrombrowser"]
                if "cookiefile" in ydl_opts: del ydl_opts["cookiefile"]
                with YoutubeDL(ydl_opts) as ydl:
                    ydl.download([clean_url])
            _register_tmpfile(job_id, str(input_path))

        # generate five variations using ffmpeg DSP filters
        variations = []
        p1 = tmpdir / f"{job_id}_lofi.mp3"
        _run_ffmpeg_filter(str(input_path), str(p1), "atempo=0.85,lowpass=f=3000", job_id)
        variations.append({"id": "lofi", "name": "Lo-Fi Slow", "desc": "Chill, Relaxed, Slowed", "file": str(p1)})

        p2 = tmpdir / f"{job_id}_nightcore.mp3"
        _run_ffmpeg_filter(str(input_path), str(p2), "atempo=1.25,asetrate=44100*1.1", job_id)
        variations.append({"id": "nightcore", "name": "Nightcore", "desc": "Fast, Energetic, High Pitch", "file": str(p2)})

        p3 = tmpdir / f"{job_id}_bass.mp3"
        _run_ffmpeg_filter(str(input_path), str(p3), "bass=g=15:f=110:w=0.6", job_id)
        variations.append({"id": "bass", "name": "Bass Boosted", "desc": "Heavy Bass, Club Vibe", "file": str(p3)})

        p4 = tmpdir / f"{job_id}_reverb.mp3"
        _run_ffmpeg_filter(str(input_path), str(p4), "aecho=0.8:0.9:1000:0.3", job_id)
        variations.append({"id": "reverb", "name": "Ethereal", "desc": "Spacious, Dreamy, Echo", "file": str(p4)})

        p5 = tmpdir / f"{job_id}_retro.mp3"
        _run_ffmpeg_filter(str(input_path), str(p5), "acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1", job_id)
        variations.append({"id": "retro", "name": "8-Bit Retro", "desc": "Crunchy, Old School, Arcade", "file": str(p5)})

        return {
            "job_id": job_id,
            "original": str(input_path),
            "results": [
                {"title": v["name"], "description": v["desc"], "stream_url": f"/stream-generated/{job_id}/{v['id']}"}
                for v in variations
            ],
        }
    except Exception as e:
        LOG.exception("AI Gen Error")
        _cleanup_registry(job_id)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/stream-generated/{job_id}/{var_id}")
async def stream_generated(job_id: str, var_id: str):
    tmpdir = Path(tempfile.gettempdir()) / "fetch_helper_ai"
    filename = f"{job_id}_{var_id}.mp3"
    path = tmpdir / filename
    if path.exists():
        return FileResponse(path, media_type="audio/mpeg", filename=f"{var_id}.mp3")
    return Response(status_code=404)
