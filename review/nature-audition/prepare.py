"""Review-only CC0 nature excerpts. Never writes to the app or changes its version."""
import array
import base64
import hashlib
import json
import math
import pathlib
import statistics
import subprocess
import sys
import urllib.parse
import urllib.request

SOURCES = {
    "rain_forest": {
        "title": "Light Rain Distant Thunder July 5th 2016",
        "author": "kvgarlic",
        "page": "https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav",
        "url": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Light_Rain_Distant_Thunder_July_5th_2016.wav",
        "source_type": "original WAV; description also mentions a bird and drops on the microphone windscreen",
    },
    "rain_soft": {
        "title": "Gentle Rain Mix (2018)",
        "author": "esh9419",
        "page": "https://freesound.org/people/esh9419/sounds/417616/",
        "url": "https://cdn.freesound.org/previews/417/417616_3285887-hq.mp3",
        "source_type": "public MP3 preview of a twelve-minute rain/thunder recording, not the original WAV",
    },
    "fire": {
        "title": "A Small Fire Crackling",
        "author": "ExplosiveTamale",
        "page": "https://freesound.org/people/ExplosiveTamale/sounds/448361/",
        "url": "https://cdn.freesound.org/previews/448/448361_4844765-hq.mp3",
        "source_type": "public MP3 preview of a small beach bonfire, not the original WAV",
    },
}
SECONDS = 16
HOSTS = {"cdn.freesound.org", "upload.wikimedia.org"}


def command(*args):
    result = subprocess.run(args, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", "replace")[-4000:])
    return result.stdout


def floats(raw):
    values = array.array("f")
    values.frombytes(raw)
    if sys.byteorder != "little":
        values.byteswap()
    return values


def decode(path, *, rate=8000, channels=1, start=None, duration=None, low=False):
    args = ["ffmpeg", "-v", "error", "-i", str(path)]
    if start is not None:
        args += ["-ss", str(start)]
    if duration is not None:
        args += ["-t", str(duration)]
    if low:
        args += ["-af", "lowpass=f=180"]
    args += ["-vn", "-ar", str(rate), "-ac", str(channels), "-f", "f32le", "pipe:1"]
    return floats(command(*args))


def energy(values):
    return math.sqrt(sum(v * v for v in values) / max(1, len(values)))


def choose_excerpt(path, kind, duration):
    rate = 8000
    values = decode(path, rate=rate)
    if len(values) < SECONDS * rate:
        raise ValueError("Source too short")
    if kind.startswith("rain"):
        low = decode(path, rate=rate, low=True)
        windows = []
        for second in range(6, int(duration) - 6):
            band = energy(low[second * rate:(second + 1) * rate])
            wide = energy(values[second * rate:(second + 1) * rate])
            if wide > 1e-6:
                windows.append((band / wide, band, second))
        # A low-frequency event candidate, not a claim of automatic thunder recognition.
        floor = statistics.median(w[1] for w in windows)
        candidates = [w for w in windows if w[1] >= floor * 1.25] or windows
        candidates.sort()
        event = candidates[int((len(candidates) - 1) * .8)][2]
        return max(0, min(duration - SECONDS, event - 6)), "low-frequency event candidate; thunder/bird identity requires listening"
    candidates = []
    for second in range(1, max(2, int(duration - SECONDS))):
        window = values[second * rate:(second + SECONDS) * rate]
        rms = energy(window)
        if rms > 1e-6:
            peaks = max(abs(v) for v in window)
            candidates.append((peaks / rms, second))
    return min(candidates)[1], "lower-crest-factor fire excerpt; voices and pop harshness require listening"


def download(source, target):
    request = urllib.request.Request(source, headers={"User-Agent": "SALAH-nature-audition/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        final = urllib.parse.urlsplit(response.url)
        if final.scheme != "https" or final.hostname not in HOSTS:
            raise ValueError("Unexpected download origin")
        total = 0
        with target.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > 64 * 1024 * 1024:
                    raise ValueError("Source exceeds preview limit")
                out.write(chunk)


def prepare(kind, folder):
    source = SOURCES[kind]
    folder.mkdir(parents=True, exist_ok=True)
    original = folder / "source.input"
    download(source["url"], original)
    info = json.loads(command("ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(original)))
    duration = float(info["format"]["duration"])
    if not SECONDS <= duration <= 1200:
        raise ValueError("Unexpected source duration")
    start, selection = choose_excerpt(original, kind, duration)
    stereo = decode(original, rate=48000, channels=2, start=start, duration=SECONDS)
    rms, peak = energy(stereo), max(abs(v) for v in stereo)
    if not math.isfinite(rms) or rms < 1e-6:
        raise ValueError("Silent or invalid excerpt")
    gain = min(.06 / rms, .30 / peak)
    output = folder / "review"
    output.mkdir(exist_ok=True)
    wav, mp3 = output / (kind + ".wav"), output / (kind + ".mp3")
    filters = f"atrim=start={start}:duration={SECONDS},asetpts=PTS-STARTPTS,volume={gain:.10f},afade=t=in:st=0:d=0.4,afade=t=out:st={SECONDS-.8}:d=0.8"
    command("ffmpeg", "-v", "error", "-y", "-i", str(original), "-vn", "-af", filters, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", str(wav))
    command("ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "256k", "-ar", "48000", str(mp3))
    checked = decode(wav, rate=48000, channels=2)
    output_peak = max(abs(v) for v in checked)
    output_rms = energy(checked)
    if output_peak > .301 or output_rms < max(1e-6, rms * gain * .5) or not SECONDS-.05 <= len(checked) / 96000 <= SECONDS+.05:
        raise ValueError("Output peak, non-silence or duration validation failed")
    encoded = mp3.read_bytes()
    if len(encoded) > 700000:
        raise ValueError("Chat audition exceeds transport limit")
    report = {
        "kind": kind, "source": source, "license": "CC0-1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "source_sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
        "source_audio": [{k: v for k, v in stream.items() if k in ("codec_name", "sample_rate", "channels", "bits_per_sample", "bit_rate")} for stream in info["streams"] if stream.get("codec_type") == "audio"],
        "source_duration": duration, "start": start, "seconds": SECONDS,
        "selection": selection, "linear_gain": gain,
        "processing": "Linear gain only, short edge fades, stereo48kHz. No invented thunder, generated ambience, noise reduction or voice processing.",
        "output_peak": output_peak, "output_rms": output_rms,
        "mp3_sha256": hashlib.sha256(encoded).hexdigest(), "mp3_bytes": len(encoded),
        "production_integrated": False, "human_listening_approved": False,
        "loop_approved": False, "blend_with_Quran_approved": False,
    }
    (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "CREDITS.md").write_text(f"# Nature audition only\n\n{source['title']} — {source['author']}\n\nSource: {source['page']}\n\nCC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/\n\n16-second excerpt, linear gain and fades. MP3 previews remain identified as previews; encoding a WAV does not recover an unavailable original. No Quran recording is redistributed or transformed. No production app files are changed. Listening and eventual loop/mix approval remain pending.\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("kind", "start", "source_duration", "output_peak", "output_rms", "mp3_sha256", "mp3_bytes")}))


def emit(kind, folder):
    output = folder / "review"
    encoded = (output / (kind + ".mp3")).read_bytes()
    report = json.loads((output / "report.json").read_text(encoding="utf-8"))
    if hashlib.sha256(encoded).hexdigest() != report["mp3_sha256"]:
        raise ValueError("Audition changed")
    print("SALAH_AUDIO_META " + json.dumps(report, ensure_ascii=False))
    print("SALAH_AUDIO_BASE64_BEGIN " + kind)
    text = base64.b64encode(encoded).decode("ascii")
    for offset in range(0, len(text), 4000):
        print(text[offset:offset+4000])
    print("SALAH_AUDIO_BASE64_END " + kind)


if __name__ == "__main__":
    sound, folder = sys.argv[1], pathlib.Path(sys.argv[2])
    if sound not in SOURCES:
        raise SystemExit("Unknown source")
    if "--emit" in sys.argv[3:]:
        emit(sound, folder)
    else:
        prepare(sound, folder)
