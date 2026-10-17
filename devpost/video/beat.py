# An original hip-hop / pop instrumental: 808 bass with glides, claps, rolling hi-hats, a synth hook. Made from scratch.
import numpy as np, soundfile as sf, sys
SR = 44100
BPM = 90
beat = 60 / BPM
bars = int(sys.argv[1]) if len(sys.argv) > 1 else 8
out = sys.argv[2] if len(sys.argv) > 2 else "beat-sample.wav"
total = int(SR * beat * 4 * bars) + SR * 2
L = np.zeros(total); R = np.zeros(total)
rng = np.random.default_rng(11)

def hz(n): return 440 * 2 ** ((n - 69) / 12)
def lp(x, a):
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a * (x[i] - s); y[i] = s
    return y
def add(sig, start, pan=0.5, g=1.0):
    i = int(start * SR); j = min(total, i + len(sig))
    if i >= total: return
    L[i:j] += sig[: j - i] * g * (1 - pan) * 2; R[i:j] += sig[: j - i] * g * pan * 2

# A minor pop progression: Am - F - C - G
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
roots = [33, 29, 36, 31]  # 808 roots (low)
# original hook: 16 sixteenth-steps per bar, None = rest (scale degrees of A minor pentatonic)
hook = [76, None, 72, None, 74, 76, None, 79, None, 76, None, 74, 72, None, 69, None]
hook2 = [76, None, 79, None, 81, None, 79, 76, None, 74, None, 72, 74, None, None, None]

s16 = beat / 4
for b in range(bars):
    t0 = b * 4 * beat
    c = chords[b % 4]
    intro = b < 1
    # pad chords (soft square-ish, filtered)
    n = int(4 * beat * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.05) * np.exp(-t * 0.4)
    pad = sum(np.sign(np.sin(2*np.pi*hz(x)*t)) * 0.5 + np.sin(2*np.pi*hz(x)*t) for x in c)
    add(lp(pad * env, 0.04) * 0.035, t0, 0.5)
    if intro:
        continue
    # 808: root on 1, syncopated hit before 3, short glide into the next bar
    for st, length, glide in [(0, 1.4, 0), (2.5 * beat, 0.9, 0), (3.5 * beat, 0.45, 1)]:
        nt = np.arange(int(length * SR)) / SR
        f0 = hz(roots[b % 4]); f1 = hz(roots[(b + 1) % 4])
        f = f0 + (f1 - f0) * np.clip(nt / length, 0, 1) * glide
        ph = 2 * np.pi * np.cumsum(f) / SR
        sub = np.tanh(np.sin(ph) * 2.2) * np.exp(-nt * 1.8) * np.minimum(1, nt / 0.004)
        add(sub * 0.16, t0 + st, 0.5)
    # kick with the 808 hits
    for st in (0, 2.5 * beat):
        kt = np.arange(int(0.25 * SR)) / SR
        add(np.sin(2*np.pi*(50 + 120*np.exp(-kt*40))*kt) * np.exp(-kt*14) * 0.22, t0 + st, 0.5)
    # clap on 2 and 4 (layered noise bursts)
    for k in (1, 3):
        cl = np.zeros(int(0.3 * SR))
        for off in (0, 0.012, 0.024):
            i = int(off * SR); m = len(cl) - i
            burst = rng.standard_normal(m) * np.exp(-np.arange(m) / SR * (60 if off < 0.02 else 18))
            cl[i:] += burst
        cl = cl - lp(cl, 0.08)
        add(cl * 0.05, t0 + k * beat, 0.5)
    # hi-hats: 8ths, with 16th/32nd rolls at the end of every 2nd bar
    def hat(st, g=0.025, pan=0.62):
        h = rng.standard_normal(int(0.04 * SR)); h = (h - lp(h, 0.5)) * np.exp(-np.arange(len(h)) / SR * 110)
        add(h * g, st, pan)
    for k in range(8):
        hat(t0 + k * beat / 2, 0.028 if k % 2 == 0 else 0.02)
    if b % 2 == 1:
        for k in range(8):
            hat(t0 + 3 * beat + k * beat / 8, 0.012 + 0.002 * k)
    # synth hook (pluck with a little vibrato), from bar 2 on
    if b >= 2:
        line = hook if (b // 2) % 2 == 0 else hook2
        for k, note in enumerate(line):
            if note is None: continue
            nt = np.arange(int(0.35 * SR)) / SR
            f = hz(note) * (1 + 0.004 * np.sin(2*np.pi*5.5*nt))
            ph = 2*np.pi*np.cumsum(f)/SR
            pl = (np.sin(ph) + 0.35*np.sin(2*ph) + 0.15*np.sin(3*ph)) * np.exp(-nt * 7)
            add(pl * 0.05, t0 + k * s16, 0.4 + 0.2 * (k % 2))

mix = np.stack([L, R], 1)
fade = np.ones(total); fi = int(0.5*SR); fo = int(2.5*SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3) * 0.85
sf.write(out, mix, SR)
print(out, round(total / SR, 1), "s")
