# Builds the final demo video: intro animation + the phone recording placed in a phone frame,
# each piece timed to its line of the voice-over, then the voice + beat mixed on top.
import json, subprocess, os, sys
from PIL import Image, ImageDraw, ImageFont

S = "/tmp/claude-0/-home-claude/3302bdd6-d14a-5633-bd53-82ac7b1d4849/scratchpad"
REC, ED, TTS, INTRO = f"{S}/rec", f"{S}/edit", f"{S}/tts", f"{S}/intro"
FONT = f"{INTRO}/nunito.ttf"
W, H, SW, SH, SX, SY, FPS = 1920, 1080, 462, 1000, 729, 40, 30
run = lambda *a: subprocess.run(a, check=True, capture_output=True)

frames = json.load(open(f"{REC}/frames.json"))
marks = {m["name"]: m["t"] for m in json.load(open(f"{REC}/marks.json"))}
t0 = frames[0]["t"]
M = {k: v - t0 for k, v in marks.items()}
print({k: round(v, 1) for k, v in M.items()})

# 1. The phone recording as one constant-rate video (frames arrive only when the screen changes).
if not os.path.exists(f"{ED}/phone.mp4"):
    with open(f"{ED}/frames.txt", "w") as f:
        for i, fr in enumerate(frames):
            nxt = frames[i + 1]["t"] if i + 1 < len(frames) else fr["t"] + 1
            f.write(f"file '{REC}/{fr['f']}'\nduration {max(0.001, nxt - fr['t']):.4f}\n")
        f.write(f"file '{REC}/{frames[-1]['f']}'\n")
    run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"{ED}/frames.txt", "-vf",
        f"fps={FPS},scale={SW}:{SH}:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "fast", f"{ED}/phone.mp4")

# 2. Side labels.
def label_png(path, step, title, badge=None):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    big = ImageFont.truetype(FONT, 54); big.set_variation_by_axes([900])
    small = ImageFont.truetype(FONT, 26); small.set_variation_by_axes([800])
    x = 120
    d.rounded_rectangle((x, 430, x + 64, 494), 32, fill="#6f9282")
    num = ImageFont.truetype(FONT, 34); num.set_variation_by_axes([900])
    d.text((x + 32, 462), str(step), font=num, fill="#fbfaf6", anchor="mm")
    d.text((x, 520), title[0], font=big, fill="#2b302d")
    if len(title) > 1: d.text((x, 584), title[1], font=big, fill="#6f9282")
    if badge:
        bw = d.textlength(badge, font=small) + 48
        bx = 1300
        d.rounded_rectangle((bx, 470, bx + bw, 530), 30, fill="#f1e3da")
        d.text((bx + 24, 500), badge, font=small, fill="#2b302d", anchor="lm")
    im.save(path)

# 3. Segments: (out_start, out_end in the voice-over) ← (src_start, src_end in the recording).
# Each segment is a list of pieces so a slot can show two moments (e.g. the lesson, then its code).
VO_END = 167.0
def seg(name, out, pieces, step, title):
    return dict(name=name, out=out, pieces=pieces, step=step, title=title)
SEGS = json.load(open(f"{ED}/plan.json")) if os.path.exists(f"{ED}/plan.json") else None
if SEGS is None:
    sys.exit("write plan.json first")

CINE = f"{S}/cine/studypal-intro-cinematic.mp4"  # the chosen intro (the 2D one is intro/studypal-intro.mp4)
clips = [f"{INTRO}/studypal-intro-video.mp4"]
if not os.path.exists(clips[0]):
    run("ffmpeg", "-y", "-i", CINE, "-an", "-c:v", "libx264", "-crf", "18", "-r", str(FPS), clips[0])

for i, s in enumerate(SEGS):
    out_len = s["out"][1] - s["out"][0]
    src = [(M[a] + da if isinstance(a, str) else a, M[b] + db if isinstance(b, str) else b) for (a, da, b, db) in s["pieces"]]
    total_src = sum(e - b for b, e in src)
    # share the slot between pieces by their source length
    parts = []
    for j, (b, e) in enumerate(src):
        plen = out_len * (e - b) / total_src
        speed = (e - b) / plen
        badge = f"⏩ {speed:.0f}× faster · real AI, sped up" if speed >= 1.8 else None
        lab = f"{ED}/label_{i}_{j}.png"
        label_png(lab, s["step"], s["title"], badge)
        out = f"{ED}/seg_{i}_{j}.mp4"
        run("ffmpeg", "-y", "-loop", "1", "-i", f"{ED}/bg.png", "-ss", f"{b:.3f}", "-t", f"{e - b:.3f}", "-i", f"{ED}/phone.mp4",
            "-i", f"{ED}/mask.png", "-loop", "1", "-i", lab, "-filter_complex",
            f"[1:v]setpts=(PTS-STARTPTS)/{speed:.5f},fps={FPS}[ph];[ph][2:v]alphamerge[pm];"
            f"[0:v][pm]overlay={SX}:{SY}:shortest=1[bgph];[bgph][3:v]overlay=0:0,format=yuv420p[v]",
            "-map", "[v]", "-t", f"{plen:.3f}", "-r", str(FPS), "-c:v", "libx264", "-crf", "18", "-preset", "fast", out)
        parts.append(out)
        print(f"{s['name']}[{j}] src {e - b:.1f}s → {plen:.1f}s ({speed:.1f}×)")
    clips += parts

# 4. Outro: the logo scene from the intro animation.
outro = f"{ED}/outro.mp4"
run("ffmpeg", "-y", "-ss", "35.2", "-t", "7.5", "-i", CINE, "-an", "-vf", "fade=t=out:st=6.6:d=0.9",
    "-c:v", "libx264", "-crf", "18", "-r", str(FPS), outro)
clips.append(outro)

with open(f"{ED}/clips.txt", "w") as f:
    for c in clips: f.write(f"file '{c}'\n")
run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"{ED}/clips.txt", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", str(FPS), f"{ED}/video-only.mp4")

# 5. Audio: voice (with its pauses) over the beat, ducked, the beat fading out at the end.
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{ED}/video-only.mp4"], capture_output=True, text=True).stdout)
bars = int(dur / (4 * 60 / 90)) + 2
if not os.path.exists(f"{ED}/beat-long.wav"):
    run("python3", f"{TTS}/beat.py", str(bars), f"{ED}/beat-long.wav")
run("ffmpeg", "-y", "-i", f"{ED}/beat-long.wav", "-i", f"{TTS}/full/voice.wav", "-filter_complex",
    "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.5,apad,asplit=2[v1][v2];[0:a]volume=0.42[m];"
    "[m][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];"
    f"[duck][v2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89,afade=t=out:st={dur - 2.5:.2f}:d=2.5[out]",
    "-map", "[out]", "-t", f"{dur:.3f}", f"{ED}/audio.wav")
run("ffmpeg", "-y", "-i", f"{ED}/video-only.mp4", "-i", f"{ED}/audio.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    "-movflags", "+faststart", f"{ED}/StudyPal-demo.mp4")
print("done", round(dur, 1), "s")
