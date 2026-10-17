# An original, calm lo-fi bed: soft pad, electric-piano plucks, gentle kick/hat. Made from scratch with numpy.
import numpy as np, soundfile as sf, sys
SR = 44100
BPM = 78
beat = 60 / BPM
bars = int(sys.argv[1]) if len(sys.argv) > 1 else 12
out = sys.argv[2] if len(sys.argv) > 2 else "music-sample.wav"
total = int(SR * beat * 4 * bars) + SR * 2
L = np.zeros(total); R = np.zeros(total)
rng = np.random.default_rng(7)

def hz(n): return 440 * 2 ** ((n - 69) / 12)
def lowpass(x, a):  # one-pole lowpass
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a * (x[i] - s); y[i] = s
    return y

# Cmaj7 - Am7 - Fmaj7 - G6 (MIDI notes)
chords = [[48, 55, 59, 64, 67], [45, 52, 55, 60, 64], [41, 48, 52, 57, 60], [43, 50, 55, 59, 64]]

def add(sig, start, pan=0.5, gain=1.0):
    i = int(start * SR); j = min(total, i + len(sig))
    L[i:j] += sig[: j - i] * gain * (1 - pan); R[i:j] += sig[: j - i] * gain * pan

for b in range(bars):
    c = chords[b % 4]; t0 = b * 4 * beat; dur = 4 * beat
    n = int(dur * SR) + SR; t = np.arange(n) / SR
    # pad: detuned soft saws, slow attack/release, lowpassed
    env = np.minimum(1, t / 0.8) * np.exp(-np.maximum(0, t - dur) * 3)
    pad = np.zeros(n)
    for note in c[1:]:
        for d in (-0.08, 0.08):
            f = hz(note) * 2 ** (d / 12)
            pad += 2 * ((t * f) % 1) - 1
    pad = lowpass(pad * env, 0.02) * 0.05
    add(pad, t0, 0.5)
    # bass: root, soft sine
    bt = np.arange(int(dur * SR)) / SR
    bass = np.sin(2 * np.pi * hz(c[0] - 12 + 12) * bt) * np.exp(-bt * 0.6) * 0.18
    add(bass, t0, 0.5)
    # electric-piano arpeggio, eighth notes with swing, some notes skipped
    pattern = [1, 3, 2, 4, 3, 2, 4, 1]
    for k, idx in enumerate(pattern):
        if rng.random() < 0.25: continue
        st = t0 + k * beat / 2 + (0.06 if k % 2 else 0)
        nt = np.arange(int(1.2 * SR)) / SR
        f = hz(c[idx] + 12)
        ep = (np.sin(2*np.pi*f*nt) + 0.3*np.sin(2*np.pi*2*f*nt) * np.exp(-nt*6)) * np.exp(-nt * 3.2) * 0.07
        add(ep, st, 0.35 + 0.3 * rng.random())
    # drums: soft kick on 1 and 3, hat on offbeats
    for k in range(4):
        st = t0 + k * beat
        kt = np.arange(int(0.35 * SR)) / SR
        if k in (0, 2):
            kick = np.sin(2*np.pi*(45 + 70*np.exp(-kt*30))*kt) * np.exp(-kt*9) * 0.35
            add(kick, st, 0.5)
        if k in (1, 3):
            sn = lowpass(rng.standard_normal(int(0.2*SR)), 0.25) * np.exp(-np.arange(int(0.2*SR))/SR*22) * 0.08
            add(sn, st, 0.5)
        ht = rng.standard_normal(int(0.05 * SR)); ht = (ht - lowpass(ht, 0.3)) * np.exp(-np.arange(len(ht))/SR*80) * 0.04
        add(ht, st + beat / 2 + 0.05, 0.6)

# vinyl hiss + gentle fade in/out
hiss = lowpass(rng.standard_normal(total), 0.15) * 0.006
L += hiss; R += hiss
mix = np.stack([L, R], 1)
fade = np.ones(total); fi = int(1.5*SR); fo = int(3*SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]
mix /= np.max(np.abs(mix)) / 0.8
sf.write(out, mix, SR)
print(out, round(total / SR, 1), "s")
