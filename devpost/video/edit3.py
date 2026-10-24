# Study Pal demo, v3: cold open on the result → problem (cinematic) → the app → how it was built → close.
# Reuses the v2 assets (phone recording, voice, beat, cinematic intro) and adds the build section.
import json, subprocess, os
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = "/tmp/claude-0/-home-claude/3302bdd6-d14a-5633-bd53-82ac7b1d4849/scratchpad"
REC, ED, TTS, INTRO, V3 = f"{S}/rec", f"{S}/edit", f"{S}/tts", f"{S}/intro", f"{S}/v3"
FONT = f"{INTRO}/nunito.ttf"
CINE = f"{S}/cine/studypal-intro-cinematic.mp4"
W, H, SW, SH, SX, SY, FPS = 1920, 1080, 462, 1000, 729, 40, 30
INK, SAGE, CLAY_SOFT, BG = "#2b302d", "#6f9282", "#f1e3da", "#fbfaf6"
run = lambda *a: subprocess.run(a, check=True, capture_output=True)
os.makedirs(f"{V3}/parts", exist_ok=True)

frames = json.load(open(f"{REC}/frames.json"))
t0 = frames[0]["t"]
M = {m["name"]: m["t"] - t0 for m in json.load(open(f"{REC}/marks.json"))}

def font(size, weight):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_axes([weight]); return f

# ── Side labels ──
def label(path, title, tag=None, step=None, sub=None, badge=None, badge_x=1300):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x = 120
    if step is not None:
        d.rounded_rectangle((x, 430, x + 64, 494), 32, fill=SAGE)
        d.text((x + 32, 462), str(step), font=font(34, 900), fill=BG, anchor="mm")
    elif tag:
        f = font(26, 800); tw = d.textlength(tag, font=f)
        d.rounded_rectangle((x, 434, x + tw + 44, 490), 28, fill=SAGE)
        d.text((x + 22, 462), tag, font=f, fill=BG, anchor="lm")
    d.text((x, 520), title[0], font=font(54, 900), fill=INK)
    if len(title) > 1: d.text((x, 584), title[1], font=font(54, 900), fill=SAGE)
    if sub:
        y = 668
        for ln in sub: d.text((x, y), ln, font=font(28, 700), fill="#5d655f"); y += 40
    if badge:
        f = font(26, 800); bw = d.textlength(badge, font=f) + 48
        d.rounded_rectangle((badge_x, 470, badge_x + bw, 530), 30, fill=CLAY_SOFT)
        d.text((badge_x + 24, 500), badge, font=f, fill=INK, anchor="lm")
    im.save(path)

def zoom_assets(zoom):
    w, h = round(SW * zoom), SH; x = (W - w) // 2; key = f"{zoom:.2f}"
    bgp, mp = f"{ED}/bgz_{key}.png", f"{ED}/maskz_{key}.png"
    if not os.path.exists(bgp):
        bg = Image.new("RGB", (W, H), "#f1eee7"); d = ImageDraw.Draw(bg)
        for (cx, cy, r, c) in [(300, 220, 260, "#dfe7e2"), (1660, 880, 320, "#f1e3da"), (1620, 170, 150, "#e0e8ec"), (230, 940, 170, "#f1e3da")]:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
        sh = Image.new("L", (W, H), 0)
        ImageDraw.Draw(sh).rounded_rectangle((x - 8, SY + 14, x + w + 8, SY + h + 20), 40, fill=90)
        bg.paste(Image.new("RGB", (W, H), INK), (0, 0), sh.filter(ImageFilter.GaussianBlur(26))); bg.save(bgp)
        m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), 36, fill=255); m.save(mp)
    return bgp, mp, x, w

n = [0]
def out_name():
    n[0] += 1; return f"{V3}/parts/p{n[0]:02d}.mp4"

# A slot of the phone recording: pieces are (src_start, src_end, zoom, focus); the slot's length is split by source length.
def phone(out_len, pieces, lab):
    total = sum(e - b for b, e, *_ in pieces); res = []
    for b, e, zoom, focus in pieces:
        plen = out_len * (e - b) / total; speed = (e - b) / plen
        badge = f"{speed:.0f}× speed · real AI, sped up" if speed >= 1.8 else None
        if zoom > 1.01:
            bgp, mp, x, w = zoom_assets(zoom); ch = f"ih/{zoom:.4f}"
            crop = f"crop=iw:{ch}:0:{focus:.3f}*(ih-{ch}),scale={w}:{SH}:flags=lanczos"
        else:
            bgp, mp, x, w = f"{ED}/bg.png", f"{ED}/mask.png", SX, SW
            crop = f"scale={SW}:{SH}:flags=lanczos"
        lp = f"{V3}/parts/label{n[0] + 1:02d}.png"; lab(lp, badge, max(1300, x + w + 40))
        out = out_name()
        run("ffmpeg", "-y", "-loop", "1", "-i", bgp, "-ss", f"{b:.3f}", "-t", f"{e - b:.3f}", "-i", f"{ED}/phone.mp4",
            "-i", mp, "-loop", "1", "-i", lp, "-filter_complex",
            f"[1:v]setpts=(PTS-STARTPTS)/{speed:.5f},fps={FPS},{crop}[ph];[ph][2:v]alphamerge[pm];"
            f"[0:v][pm]overlay={x}:{SY}:shortest=1[bgph];[bgph][3:v]overlay=0:0,format=yuv420p[v]",
            "-map", "[v]", "-t", f"{plen:.3f}", "-r", str(FPS), "-c:v", "libx264", "-crf", "18", "-preset", "fast", out)
        res.append(out)
    return res

# A document page scrolling inside a rounded card on the right.
CW, CH, CX, CY = 860, 960, 940, 60
def card_assets():
    bgp, mp = f"{V3}/card-bg.png", f"{V3}/card-mask.png"
    if not os.path.exists(bgp):
        bg = Image.new("RGB", (W, H), "#f1eee7"); d = ImageDraw.Draw(bg)
        for (cx, cy, r, c) in [(300, 220, 260, "#dfe7e2"), (1660, 880, 320, "#f1e3da"), (1620, 170, 150, "#e0e8ec"), (230, 940, 170, "#f1e3da")]:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
        sh = Image.new("L", (W, H), 0)
        ImageDraw.Draw(sh).rounded_rectangle((CX - 8, CY + 14, CX + CW + 8, CY + CH + 20), 36, fill=90)
        bg.paste(Image.new("RGB", (W, H), INK), (0, 0), sh.filter(ImageFilter.GaussianBlur(26))); bg.save(bgp)
        m = Image.new("L", (CW, CH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, CW - 1, CH - 1), 28, fill=255); m.save(mp)
    return bgp, mp

def doc(png, dur, scroll_px, start_px, lab):
    bgp, mp = card_assets()
    h = Image.open(png).size[1]; end = min(h - CH, start_px + scroll_px); dist = max(0, end - start_px)
    lp = f"{V3}/parts/label{n[0] + 1:02d}.png"; lab(lp, None, 0)
    out = out_name()
    y = f"{start_px}+{dist}*(t/{dur})*(t/{dur})*(3-2*t/{dur})"  # smooth ease in and out
    run("ffmpeg", "-y", "-loop", "1", "-i", bgp, "-loop", "1", "-i", png, "-i", mp, "-loop", "1", "-i", lp, "-filter_complex",
        f"[1:v]fps={FPS},crop={CW}:{CH}:0:'{y}'[pg];[pg][2:v]alphamerge[pm];[0:v][pm]overlay={CX}:{CY}[b];[b][3:v]overlay=0:0,format=yuv420p[v]",
        "-map", "[v]", "-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-crf", "18", "-preset", "fast", out)
    return [out]

# Title card: the skill steps appear one by one.
def title_card(dur):
    steps = ["1-start", "2-scope", "3-prd", "4-spec", "5-build", "6-ship"]
    bg = Image.open(card_assets()[0].replace("card-bg", "card-bg")).copy()
    base = Image.new("RGB", (W, H), "#f1eee7"); d = ImageDraw.Draw(base)
    for (cx, cy, r, c) in [(300, 220, 260, "#dfe7e2"), (1660, 880, 320, "#f1e3da"), (1620, 170, 150, "#e0e8ec"), (230, 940, 170, "#f1e3da")]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
    d.text((W // 2, 360), "How I built it", font=font(96, 900), fill=INK, anchor="mm")
    d.text((W // 2, 450), "with the Devpost Learn Skill Pack: plan first, then build in small slices", font=font(36, 700), fill="#5d655f", anchor="mm")
    f = font(34, 800); pad, gap, arrow = 30, 22, 46
    widths = [d.textlength(s, font=f) + 2 * pad for s in steps]
    total = sum(widths) + (len(steps) - 1) * (2 * gap + arrow); x0 = (W - total) / 2
    imgs = []
    for k in range(len(steps) + 1):
        im = base.copy(); dd = ImageDraw.Draw(im); x = x0
        for i, s in enumerate(steps):
            on = i < k
            dd.rounded_rectangle((x, 560, x + widths[i], 640), 40, fill=SAGE if on else "#e6e2d8")
            dd.text((x + widths[i] / 2, 600), s, font=f, fill=BG if on else "#b9b4a8", anchor="mm")
            x += widths[i]
            if i < len(steps) - 1:
                c = SAGE if i < k - 1 else "#cfcabe"; ax = x + gap
                dd.line((ax, 600, ax + arrow - 12, 600), fill=c, width=5)
                dd.polygon([(ax + arrow, 600), (ax + arrow - 16, 590), (ax + arrow - 16, 610)], fill=c)
                x += 2 * gap + arrow
        p = f"{V3}/parts/title{k}.png"; im.save(p); imgs.append(p)
    lst = f"{V3}/parts/title.txt"; step = 0.32
    with open(lst, "w") as fo:
        for k, p in enumerate(imgs):
            fo.write(f"file '{p}'\nduration {step if k < len(imgs) - 1 else dur - step * (len(imgs) - 1):.3f}\n")
        fo.write(f"file '{imgs[-1]}'\n")
    out = out_name()
    run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-vf", f"fps={FPS},format=yuv420p", "-t", f"{dur:.3f}",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast", out)
    return [out]

def cine(start, dur, extra=""):
    out = out_name()
    run("ffmpeg", "-y", "-ss", f"{start}", "-t", f"{dur}", "-i", CINE, "-an", "-vf", f"fps={FPS},format=yuv420p{extra}",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast", out)
    return [out]

L = lambda title, step=None, tag=None, sub=None: (lambda p, badge, bx: label(p, title, tag=tag, step=step, sub=sub, badge=badge, badge_x=bx))
P = lambda a, da, b, db, zoom=1.0, focus=0.0: (M[a] + da, M[b] + db, zoom, focus)

voice, SR = sf.read(f"{TTS}/full/voice.wav")
if voice.ndim > 1: voice = voice[:, 0]
v = lambda a, b: voice[int(a * SR):int(b * SR)]
sil = lambda s: np.zeros(int(s * SR))
build_line, sr2 = sf.read(f"{V3}/build-line.wav"); assert sr2 == SR

clips, audio = [], []
def add(vclips, aud, dur):
    clips.extend(vclips); a = aud[:int(dur * SR)]
    audio.append(np.concatenate([a, sil(dur - len(a) / SR)]) if len(a) < int(dur * SR) else a)

# 1. Cold open: the result first, and what the app is and who it's for.
add(phone(4.0, [P("compare", 1.0, "compare", 4.0, 1.4, 0.25)],
          L(["Learn your own", "unit PDFs"], tag="Study Pal", sub=["For college and university students:", "tested first, taught your gaps,", "then your before-and-after."])), sil(4.0), 4.0)
# 2. The problem, over the cinematic footage (drops "Let's see how it works").
add(cine(1.0, 41.6), v(1.0, 42.6), 41.6)
# 3. The app. Voice slots are the v2 ones with the long waits shortened; "The result is…" is dropped.
DEMO = [  # (voice range, title, step, pieces)
    ((45.4, 61.5), ["Upload your", "study material"], 1, [P("home", 0.5, "test", 0)]),
    ((66.5, 81.3), ["Test first,", "in your own words"], 2, [P("test", 0, "results", 0)]),
    ((83.4, 89.5), ["See your gaps,", "pick a style"], 3, [P("results", 0, "results", 6, 1.4, 0.25), P("style", 0, "style", 4)]),
    ((89.5, 99.9), ["Lessons from", "your own PDF"], 4, [P("lesson-0", 0, "ask", 0, 1.35, 0.12), P("code", -3, "code", 5)]),
    ((102.9, 111.8), ["Ask, check,", "keep going"], 5, [P("ask", 0, "ask-done", 0), P("check-0", 6, "check-0", 16)]),
    ((111.8, 118.7), ["Final test,", "new questions"], 6, [P("final", 0, "final", 10)]),
    ((118.7, 126.5), ["Still stuck?", "Fix this topic"], 7, [P("fix", 0, "fix", 10), P("retake", 0, "retake", 8)]),
    ((133.1, 141.6), ["Before", "and after"], 8, [P("compare", 0, "compare", 4, 1.4, 0.3), P("compare", 4, "fix", -0.3)]),
]
for (a, b), title, step, pieces in DEMO:
    add(phone(b - a, pieces, L(title, step=step)), v(a, b), b - a)
# 4. How it was built.
intro, _ = sf.read(f"{V3}/build-intro.wav")
TD, DD = 3.6, 3.5  # title card, then each planning doc; the voice runs across all four
part = title_card(TD)
for name, title in [("scope", ["scope.md:", "what to build"]), ("prd", ["prd.md:", "how it behaves"]), ("spec", ["spec.md:", "how it's built"])]:
    part += doc(f"{V3}/doc-{name}.png", DD, 560, 0, L(title, tag="Planned before any code"))
add(part, np.concatenate([sil(0.3), intro]), TD + 3 * DD)
line_len = len(build_line) / SR
chk = doc(f"{V3}/doc-checklist.png", 5.2, 1500, 900, L(["Small slices,", "each tried on a phone"], tag="Then built step by step"))
les = phone(line_len + 1.3 - 5.2, [P("code", -6, "code", 2)], L(["Lessons from", "your own pages"], tag="The hardest part"))
add(chk + les, np.concatenate([sil(0.4), build_line]), line_len + 1.3)
# 5. Close: progress and focus, then the logo.
add(phone(16.1, [P("wrap", 0, "end", 0)], L(["Your progress,", "your focus"], step=9)), v(141.6, 157.7), 16.1)
add(cine(34.9, 7.7, ",tpad=stop_mode=clone:stop_duration=1.8,fade=t=out:st=8.4:d=1.1"), v(157.7, 167.1), 9.5)

with open(f"{V3}/clips.txt", "w") as f:
    for c in clips: f.write(f"file '{c}'\n")
run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"{V3}/clips.txt", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-r", str(FPS), f"{V3}/video-only.mp4")
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{V3}/video-only.mp4"], capture_output=True, text=True).stdout)
sf.write(f"{V3}/voice3.wav", np.concatenate(audio), SR)
print("video", round(dur, 2), "voice", round(sum(len(a) for a in audio) / SR, 2))

# Audio: same mix as v2 (beat ducked under the voice, limiter, fade out).
if not os.path.exists(f"{V3}/beat-long.wav"): run("python3", f"{TTS}/beat.py", str(int(dur / (4 * 60 / 90)) + 2), f"{V3}/beat-long.wav")
run("ffmpeg", "-y", "-i", f"{V3}/beat-long.wav", "-i", f"{V3}/voice3.wav", "-filter_complex",
    "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.5,apad,asplit=2[v1][v2];[0:a]volume=0.85[m];"
    "[m][v1]sidechaincompress=threshold=0.05:ratio=3:attack=30:release=500[duck];"
    f"[duck][v2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89,afade=t=out:st={dur - 2.5:.2f}:d=2.5[out]",
    "-map", "[out]", "-t", f"{dur:.3f}", f"{V3}/audio.wav")
run("ffmpeg", "-y", "-i", f"{V3}/video-only.mp4", "-i", f"{V3}/audio.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    "-movflags", "+faststart", f"{V3}/StudyPal-demo.mp4")
print("done", round(dur, 1))
