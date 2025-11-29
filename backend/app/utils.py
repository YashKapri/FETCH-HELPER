# backend/app/utils.py

from typing import Tuple


def select_formats(formats, preferred_resolution=1080):
    """
    Choose the best video-only and best audio-only formats.

    Returns:
        (video_format, audio_format)
    """
    # AUDIO ONLY formats
    audio_candidates = [
        f for f in formats
        if f.get("acodec") != "none" and f.get("vcodec") == "none"
    ]
    audio_candidates = sorted(
        audio_candidates,
        key=lambda f: (f.get("abr") or 0)
    )
    audio_best = audio_candidates[-1] if audio_candidates else None

    # VIDEO ONLY formats
    video_candidates = [
        f for f in formats
        if f.get("vcodec") != "none" and f.get("acodec") == "none"
    ]

    def resolution_score(f):
        height = f.get("height") or 0
        return -abs(height - preferred_resolution)

    video_candidates = sorted(video_candidates, key=resolution_score)
    video_best = video_candidates[0] if video_candidates else None

    # Fallback to A+V if no video-only available
    if not video_best:
        both = [
            f for f in formats
            if f.get("vcodec") != "none" and f.get("acodec") != "none"
        ]
        both = sorted(both, key=lambda f: (f.get("height") or 0), reverse=True)
        video_best = both[0] if both else None

    # If no audio-only, reuse audio from combined format
    if not audio_best and video_best:
        if video_best.get("acodec") != "none":
            audio_best = video_best

    return video_best, audio_best


def run_ffmpeg_extract_audio(infile: str, outfile: str):
    """
    Extract audio from input file and convert to MP3.
    """
    import subprocess
    subprocess.run([
        "ffmpeg", "-y",
        "-i", infile,
        "-vn",
        "-ab", "192k",
        "-ar", "44100",
        "-f", "mp3",
        outfile
    ], check=True)
