"""Build selected CC0 nature loops; app integration is a separate reviewed change."""
import array
import hashlib
import json
import math
import pathlib
import sys
from prepare import SOURCES, command, decode, download, emit, energy, floats

SELECTED = {"rain": ("rain_soft", 34), "fire": ("fire_v2", 10), "forest": ("forest_v2", 20), "ocean": ("ocean_v2", 30), "wind": ("wind_mountain", 20)}
RATE, CHANNELS, LOOP, SEAM = 48000, 2, 32, 2


def prepare_master(kind, folder):
    key, approved_start = SELECTED[kind]
    source = SOURCES[key]
    folder.mkdir(parents=True, exist_ok=True)
    original = folder / "source.input"
    download(source["url"], original)
    info = json.loads(command("ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(original)))
    duration = float(info["format"]["duration"])
    seconds = LOOP + SEAM
    if not seconds + 1 <= duration <= 1200:
        raise ValueError("Source length outside supported bounds")
    start = min(approved_start, duration - seconds - 1)
    raw = decode(original, rate=RATE, channels=CHANNELS, start=start, duration=seconds)
    if len(raw) != RATE * CHANNELS * seconds:
        raise ValueError("Incomplete source excerpt")
    # Preserve natural stereo. The last two seconds blend into the initial
    # two seconds; playback begins at second two, so its repeated portion is32s.
    for i in range(RATE * SEAM):
        phase = i / (RATE * SEAM - 1) * math.pi / 2
        tail, head = math.cos(phase), math.sin(phase)
        for channel in range(CHANNELS):
            end = (RATE * LOOP + i) * CHANNELS + channel
            raw[end] = raw[end] * tail + raw[i * CHANNELS + channel] * head
    for channel in range(CHANNELS):
        mean = sum(raw[channel::CHANNELS]) / (len(raw) // CHANNELS)
        for i in range(channel, len(raw), CHANNELS):
            raw[i] -= mean
    rms = energy(raw)
    if not math.isfinite(rms) or rms < 1e-6:
        raise ValueError("Silent source")
    gain = min(.10 / rms, 16)
    pcm = folder / "seamed.f32le"
    if sys.byteorder != "little":
        raw.byteswap()
    pcm.write_bytes(raw.tobytes())
    output = folder / "review"
    output.mkdir(exist_ok=True)
    wav, mp3 = output / (kind + ".wav"), output / (kind + ".mp3")
    filters = f"volume={gain:.10f},alimiter=limit=0.65:attack=3:release=120:level=false"
    command("ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", str(CHANNELS), "-i", str(pcm), "-af", filters, "-c:a", "pcm_s24le", str(wav))
    command("ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "256k", "-ar", str(RATE), str(mp3))
    checked = decode(mp3, rate=RATE, channels=CHANNELS)
    actual_seconds = len(checked) / RATE / CHANNELS
    peak, output_rms = max(abs(v) for v in checked), energy(checked)
    if abs(actual_seconds - seconds) > .02 or not .02 < output_rms < .13 or peak > .85:
        raise ValueError(f"Invalid encoded master: seconds={actual_seconds}, rms={output_rms}, peak={peak}")
    loop_frame = RATE * SEAM
    jumps = sorted(abs(checked[i] - checked[i-CHANNELS]) for i in range(CHANNELS, len(checked), CHANNELS * 16))
    jump99 = jumps[int((len(jumps)-1)*.99)]
    boundary = max(abs(checked[-CHANNELS+c] - checked[loop_frame*CHANNELS+c]) for c in range(CHANNELS))
    if boundary > max(.025, jump99 * 1.3):
        raise ValueError(f"Loop boundary is sharper than normal source dynamics: {boundary}, p99={jump99}")
    encoded = mp3.read_bytes()
    if len(encoded) > 1500000:
        raise ValueError("Master exceeds asset budget")
    blob = b"blob " + str(len(encoded)).encode("ascii") + b"\0" + encoded
    report = {"kind":kind,"selected_preview":key,"source":source,"license":"CC0-1.0","license_url":"https://creativecommons.org/publicdomain/zero/1.0/","source_sha256":hashlib.sha256(original.read_bytes()).hexdigest(),"source_duration":duration,"start":start,"approved_preview_start":approved_start,"seconds":seconds,"loopStart":SEAM,"loopEnd":seconds,"loop_seconds":LOOP,"sampleRate":RATE,"channels":CHANNELS,"linear_gain":gain,"peak_limiting":True,"noise_reduction":False,"output_peak":peak,"output_rms":output_rms,"boundary_jump":boundary,"normal_jump_p99":jump99,"mp3_bytes":len(encoded),"mp3_sha256":hashlib.sha256(encoded).hexdigest(),"git_blob_sha":hashlib.sha1(blob).hexdigest(),"source_is_original_lossless":False,"sound_character_selected_by_owner":True,"production_integrated":False,"processing":"Selected real-recording excerpt, stereo48k, per-channel DC removal, two-second equal-power seam, bounded level gain (max16x), peak limiter, MP3 256kbps. No invented ambience, no noise reduction, no Quran processing. Encoding cannot restore the unavailable lossless source."}
    (output / "report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    (output / "CREDITS.md").write_text(f"# {kind}\n\n{source['title']} — {source['author']}\n\n{source['page']}\n\nCC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/\n\nMP3 preview source; trimmed, level adjusted and seamed as recorded in report.json. No claim of recovered lossless quality.\n",encoding="utf-8")
    print(json.dumps({k:report[k] for k in ("kind","start","seconds","output_peak","output_rms","boundary_jump","normal_jump_p99","mp3_bytes","mp3_sha256")}))


if __name__ == "__main__":
    kind, folder = sys.argv[1], pathlib.Path(sys.argv[2])
    if kind not in SELECTED:
        raise SystemExit("Unknown selected sound")
    if "--emit" in sys.argv[3:]:
        emit(kind, folder)
    else:
        prepare_master(kind, folder)

