# Wonderwall — Voice-Controlled Art Gallery

A Flask + TensorFlow website starter for the six-command Keras model:
- `on` → `Open_Box`
- `off` → `Close_Box`
- `up`, `down`, `left`, `right` → gallery navigation

The page starts with a cartoon-style box. Voice control records one-second microphone chunks, encodes each chunk as 16 kHz mono 16-bit PCM WAV, sends it to Flask, and uses the existing `.keras` model for prediction. The gallery contains demo landscape photos and Pinterest search links.

## 1. Requirements

- Python 3.10 or 3.11 recommended for compatibility with your TensorFlow install.
- Your downloaded model: `voice_command_model_final.keras`
- Chrome or Edge, with microphone permission enabled.

## 2. Put the model in the project

Copy the downloaded model file into the same folder as `app.py`:

```
voice_art_gallery/
  app.py
  voice_command_model_final.keras
  requirements.txt
  templates/
  static/
```

Alternatively, set the `MODEL_PATH` environment variable to the model's full path.

## 3. Install and run

Open PowerShell/Terminal in the project directory:

```bash
python -m venv .venv
```

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, use Command Prompt and run:
```bat
.venv\Scripts\activate.bat
```

Then open `http://127.0.0.1:5000` in Chrome or Edge.

The first prediction can take longer because TensorFlow loads the model on first use. The microphone should work on localhost. For deployment on another domain, use HTTPS.

## 4. How to use

1. Click **Start voice control** and allow microphone access.
2. Speak one command clearly: `on`, `off`, `left`, `right`, `up`, or `down`.
3. The website listens in one-second chunks and sends them to the model.
4. Click **Stop voice control** to stop recording.

The model was trained on Google's Speech Commands data. Its validation/test accuracy does not guarantee the same accuracy on your own voice, room, or microphone. Test with the project team's recordings before presenting. The confidence threshold in `static/app.js` is `0.75`; adjust only after testing.

## 5. Add images from Pinterest

Pinterest often blocks direct image hotlinking, and pins may be copyrighted. This demo therefore shows remote Unsplash landscape photos and gives each artwork a Pinterest search link.

To use an image you have permission to display:
1. Obtain a usable image file or stable image URL and check its usage rights.
2. Add a local image under `static/images/` (create that folder), or update the `image` URL in the `artworks` array in `static/app.js`.
3. Update the matching `pinterest` search phrase/title/category.

For local images, use paths such as `/static/images/mountain-art.jpg`. Do not use a Pinterest page URL as an `<img src>`; a page URL is not an image file URL.

## 6. Important implementation notes

- This project is a functional starter, not a production deployment.
- The model is loaded on the server. Do not expose a public prediction endpoint without rate limiting, request-size limits, authentication if needed, and deployment hardening.
- A 1-second sliding/chunked listener can capture silence or parts of a word. Speak each command clearly and leave a short pause between commands. If recognition is unreliable, switch to push-to-talk or collect in-domain examples and evaluate them.
- The wall renders a 3-by-3 window of adjacent artworks. Left/right move one column; up/down move one row (three entries in the list). Navigation wraps around the selected category's list, creating an endless-feeling loop through the demo set. Replace the `artworks` array with a much larger catalogue for a richer gallery.
- The `Up` and `Down` commands currently move to the previous/next artwork because the starter wall is a single horizontal row. A true two-dimensional wall can be implemented by assigning each painting grid coordinates and moving across rows and columns.
