# backend/download_with_redis.py
import threading
import uuid
import json
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from yt_dlp import YoutubeDL
import redis  # pip install redis

# ---------- CONFIG ----------
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB = 0
REDIS_TTL_SECONDS = 24 * 3600  # metadata expiry in Redis (e.g. 24 hours)

# Where you want files permanently stored on the server (absolute)
DOWNLOAD_DIR = Path.home() / "Downloads" / "FetchHelper"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
# ----------------------------

app = FastAPI(title="Fetch Helper - Redis-backed downloader")

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)

class DownloadRequest(BaseModel):
    url: str

def redis_set_status(job_id: str, payload: Dict):
    """Write the JSON payload into redis and set TTL."""
    key = f"download:{job_id}"
    r.set(key, json.dumps(payload))
    r.expire(key, REDIS_TTL_SECONDS)

def yt_progress_hook(job_id: str):
    """Return a hook function for yt-dlp to update redis progress."""
    def hook(d):
        # d is a dictionary with status updates from yt-dlp
        key = f"download:{job_id}"
        state = r.get(key)
        if state:
            try:
                payload = json.loads(state)
            except Exception:
                payload = {}
        else:
            payload = {}

        # Update interesting fields (see yt-dlp progress dict keys)
        status = d.get("status")  # "downloading", "finished", "error"
        payload["status"] = status

        if status == "downloading":
            # bytes_downloaded, total_bytes, eta, speed
            payload["downloaded_bytes"] = d.get("downloaded_bytes") or d.get("downloaded_bytes_estimate")
            payload["total_bytes"] = d.get("total_bytes") or d.get("total_bytes_estimate")
            payload["eta"] = d.get("eta")
            payload["speed"] = d.get("speed")
        elif status == "finished":
            # 'filename' will be provided by yt-dlp when finished
            payload["filename"] = d.get("filename")
        elif status == "error":
            payload["error"] = d.get("error", "download error")

        # write back
        redis_set_status(job_id, payload)
    return hook

def download_worker(job_id: str, url: str):
    """Runs in separate thread. Updates redis via progress hooks."""
    key = f"download:{job_id}"

    # initialize metadata
    initial = {"status": "queued", "url": url}
    redis_set_status(job_id, initial)

    try:
        ydl_opts = {
            "format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "merge_output_format": "mp4",
            "outtmpl": str(DOWNLOAD_DIR / "%(title)s.%(ext)s"),
            "noprogress": True,  # suppress yt-dlp printing to stdout
            "progress_hooks": [yt_progress_hook(job_id)],
        }

        # mark started
        redis_set_status(job_id, {"status": "started", "url": url})

        with YoutubeDL(ydl_opts) as ydl:
            # extract_info will download because download=True is default when invoked as below
            info = ydl.extract_info(url, download=True)

        # after download, determine file path
        saved_path = ydl.prepare_filename(info)
        payload = {
            "status": "finished",
            "url": url,
            "filename": saved_path,
            "title": info.get("title"),
            "filesize": info.get("filesize") or info.get("filesize_approx")
        }
        redis_set_status(job_id, payload)

    except Exception as exc:
        payload = {"status": "error", "url": url, "error": str(exc)}
        redis_set_status(job_id, payload)

@app.post("/download")
def start_download(req: DownloadRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing URL")

    job_id = str(uuid.uuid4())
    # create key with queued status
    redis_set_status(job_id, {"status": "queued", "url": url})

    # start background thread (non-blocking)
    t = threading.Thread(target=download_worker, args=(job_id, url), daemon=True)
    t.start()

    # return job_id to frontend
    return {"job_id": job_id, "status_url": f"/status/{job_id}"}

@app.get("/status/{job_id}")
def get_status(job_id: str):
    key = f"download:{job_id}"
    data = r.get(key)
    if not data:
        raise HTTPException(status_code=404, detail="Job not found or expired")
    return json.loads(data)
