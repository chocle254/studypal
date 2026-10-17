import sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("kokoro.onnx", "voices.bin")
text = "Hi, this is a voice sample for your Study Pal demo. Pick the one that sounds best to you."
for v in ["am_michael", "am_adam", "bf_emma", "af_heart"]:
    a, sr = k.create(text, voice=v, speed=1.0, lang="en-us" if v[0]=="a" else "en-gb")
    sf.write(f"sample-{v}.wav", a, sr)
    print(v, round(len(a)/sr,1), "s")
