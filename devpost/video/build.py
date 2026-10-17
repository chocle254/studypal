import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("kokoro.onnx", "voices.bin")
lines = [l.strip() for l in open("full/script.txt") if l.strip()]
# longer pauses after the hook, before the walkthrough, and before the closing
long_after = {3, 5, 13, 15}
SR = 24000
parts, t, sheet = [], 0.0, []
for i, line in enumerate(lines):
    a, sr = k.create(line.replace("StudyPal", "Study Pal"), voice="af_heart", speed=1.0, lang="en-us")
    sheet.append((t, len(a) / sr, line))
    parts.append(a); t += len(a) / sr
    gap = 1.3 if i in long_after else 0.6
    # breathing room where the real AI is slow: reading the PDF, marking the test, writing the lesson
    gap += {6: 9.0, 7: 4.0, 9: 5.0}.get(i, 0)
    if i == len(lines) - 1: gap = 2.0
    parts.append(np.zeros(int(gap * SR))); t += gap
lead = np.zeros(int(1.5 * SR))  # 1.5s of beat before the first word
voice = np.concatenate([lead] + parts)
sf.write("full/voice.wav", voice, SR)
with open("full/timing.txt", "w") as f:
    for start, dur, line in sheet:
        s = start + 1.5
        f.write(f"{int(s//60)}:{s%60:04.1f}  {line}\n")
print("total", round(len(voice) / SR, 1), "s")
