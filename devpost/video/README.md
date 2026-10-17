# Demo video sources

Everything used to make the Study Pal demo video, so it can be rebuilt. All media is original (made from scratch); the voice is the open-source Kokoro model (voice `af_heart`) reading the narration in `script.txt`.

| File | What it makes |
|---|---|
| `script.txt` | The narration, one line per spoken sentence |
| `build.py` | Voice-over (`voice.wav`) with pauses, plus `timing.txt` (needs `kokoro-onnx` and its model files) |
| `voice-samples.py` | Short samples of four voices |
| `beat.py` / `music.py` | The original hip-hop/pop beat and an alternative calm lo-fi track (numpy) |
| `intro.html` + `render.mjs` | The 2D animated intro, rendered frame by frame with Playwright (`keys.mjs` renders keyframes to check) |
| `intro-to-machine-learning.pdf` (`make_pdf.py`) | The small demo PDF used in the recording |
| `record.mjs` | Records a full round on the live app at phone resolution, with tap ripples and scene marks |
| `assets.py` + `edit.py` | Background and phone frame, then the final edit: intro → phone footage timed to each line → outro, with voice and beat mixed |

Paths inside the scripts point at the working folder they were made in; adjust them to rebuild elsewhere.
