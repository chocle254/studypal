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
| `shots.mjs` + `edit3.py` | The current cut (2:56): cold open on the before-and-after → the problem over the cinematic footage → the app → how it was built (skill steps, scope/PRD/spec, build checklist) → close |

Paths inside the scripts point at the working folder they were made in; adjust them to rebuild elsewhere.

## Cinematic intro (alternative)

`cinematic-plates.sh` cuts, crops, grades and slowly pushes in on free stock clips from Pexels (Pexels licence: free to use and modify, no attribution required), timed to the narration. `cinematic-overlay.html` is the animated text, letterbox and logo layer, rendered with transparency and composited on top with grain and a vignette.

Clips used (pexels.com/video/…): 9080222 (book pages), 8257361 (highlighting notes), 8196796 (student in an exam), 7987514 (typing in the dark), 4351798 (typing close-up), 8196803 (student stressed at a laptop), 20563164 (silhouette at a laptop).
