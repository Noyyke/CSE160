# Song library

Each song lives in its own folder under `songs/`. Add an entry to `manifest.json` when you add a new song.

Example layout:

```
songs/
  manifest.json
  PUPA/
    pupa.json
    pupa.mp3
```

`manifest.json` fields:

- `id` — unique key (usually the folder name)
- `title` — display name
- `artist` — optional
- `chart` — path to JSON relative to `songs/` (e.g. `PUPA/pupa.json`)
- `audio` — path to MP3/OGG relative to `songs/` (optional but recommended)

Serve the game over HTTP (e.g. Live Server on `asg5/src/`) so the browser can fetch these files.

**Timing:** In-game, note `time` values are seconds into the MP3 from the start (same as the editor playhead). The `offset` field in the JSON is for the editor only (aligning the waveform), not skipped at playback. Use the **Timing adjust** slider in Chart mode if hits feel slightly early or late.
