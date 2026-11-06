from pathlib import Path
import io
import os
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("MODEL_PATH", BASE_DIR / "voice_command_model_final.keras"))

LABELS = ["Open_Box", "Close_Box", "Up", "Down", "Left", "Right"]
COMMAND_WORDS = {
    "Open_Box": "on",
    "Close_Box": "off",
    "Up": "up",
    "Down": "down",
    "Left": "left",
    "Right": "right",
}

app = Flask(__name__)
model = None
mel_matrix = tf.signal.linear_to_mel_weight_matrix(
    num_mel_bins=40,
    num_spectrogram_bins=257,
    sample_rate=16000,
    lower_edge_hertz=20.0,
    upper_edge_hertz=7600.0,
)

def load_model_once():
    global model
    if model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Copy "
                "'voice_command_model_final.keras' beside app.py or set MODEL_PATH."
            )
        model = tf.keras.models.load_model(MODEL_PATH)
    return model

def wav_bytes_to_features(wav_bytes):
    """Decode mono 16-bit PCM WAV, normalize to 1 second/16 kHz, then match training features."""
    import wave

    with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()
        sample_rate = wav.getframerate()
        frames = wav.readframes(wav.getnframes())

    if sample_width != 2:
        raise ValueError("Expected a 16-bit PCM WAV recording.")
    audio = np.frombuffer(frames, dtype="<i2").astype(np.float32) / 32768.0

    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)

    if sample_rate != 16000:
        # Simple interpolation fallback. The browser recorder sends 16 kHz already.
        old_x = np.linspace(0, 1, num=len(audio), endpoint=False)
        new_len = int(round(len(audio) * 16000 / sample_rate))
        new_x = np.linspace(0, 1, num=new_len, endpoint=False)
        audio = np.interp(new_x, old_x, audio).astype(np.float32)

    if len(audio) < 16000:
        audio = np.pad(audio, (0, 16000 - len(audio)))
    else:
        audio = audio[:16000]

    audio_tf = tf.convert_to_tensor(audio, dtype=tf.float32)
    stft = tf.signal.stft(
        audio_tf, frame_length=400, frame_step=160, fft_length=512
    )
    power_spectrogram = tf.square(tf.abs(stft))
    mel_spectrogram = tf.matmul(power_spectrogram, mel_matrix)
    log_mel = tf.math.log(mel_spectrogram + 1e-6)
    features = log_mel[..., tf.newaxis]
    return tf.ensure_shape(features, (98, 40, 1))[tf.newaxis, ...]

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/health")
def health():
    return jsonify({"ok": True, "model_path": str(MODEL_PATH), "model_exists": MODEL_PATH.exists()})

@app.post("/predict")
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "No WAV audio was uploaded."}), 400
    try:
        audio_bytes = request.files["audio"].read()
        features = wav_bytes_to_features(audio_bytes)
        probabilities = load_model_once().predict(features, verbose=0)[0]
        best_id = int(np.argmax(probabilities))
        label = LABELS[best_id]
        confidence = float(probabilities[best_id])
        return jsonify({
            "label": label,
            "command": COMMAND_WORDS[label],
            "confidence": confidence,
            "probabilities": {LABELS[i]: float(probabilities[i]) for i in range(len(LABELS))}
        })
    except Exception as exc:
        app.logger.exception("Prediction failed")
        return jsonify({"error": str(exc)}), 500

if __name__ == "__main__":
    print(f"Model path: {MODEL_PATH}")
    app.run(host="127.0.0.1", port=5000, debug=True)
