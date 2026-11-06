const entrance = document.getElementById("entrance");
const gallery = document.getElementById("gallery");
const magicBox = document.getElementById("magicBox");
const startVoiceBtn = document.getElementById("startVoice");
const startVoiceText = document.getElementById("startVoiceText");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const galleryVoiceStatus = document.getElementById("galleryVoiceStatus");
const connectionText = document.getElementById("connectionText");
const toast = document.getElementById("toast");
const paintingWall = document.getElementById("paintingWall");
const categoryBar = document.getElementById("categoryBar");
const positionLabel = document.getElementById("positionLabel");

const categories = ["All scenes", "Mountains", "Forests", "Sea & coast", "Waterfalls", "Sunsets", "Meadows"];
// Demo artwork photos. Replace image URLs with Pinterest images you are permitted to use.
// Pinterest search links are included for discovery; Pinterest image hotlinking may be blocked.
const artworks = [
  {title:"Above the Clouds", category:"Mountains", image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85", pinterest:"mountain landscape painting"},
  {title:"The Quiet Forest", category:"Forests", image:"https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=85", pinterest:"forest landscape painting"},
  {title:"Blue Horizon", category:"Sea & coast", image:"https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1000&q=85", pinterest:"ocean seascape painting"},
  {title:"The Last Light", category:"Sunsets", image:"https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=1000&q=85", pinterest:"sunset landscape painting"},
  {title:"Hidden Falls", category:"Waterfalls", image:"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1000&q=85", pinterest:"waterfall landscape painting"},
  {title:"Green Silence", category:"Meadows", image:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85", pinterest:"green meadow landscape painting"},
  {title:"Mountain Dream", category:"Mountains", image:"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=85", pinterest:"dreamy mountain art painting"},
  {title:"Into the Woods", category:"Forests", image:"https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1000&q=85", pinterest:"enchanted forest painting"},
  {title:"Salt & Sky", category:"Sea & coast", image:"https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1000&q=85", pinterest:"coastal art painting"},
  {title:"Amber Evening", category:"Sunsets", image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85", pinterest:"golden sunset landscape art"},
  {title:"Misty Cascade", category:"Waterfalls", image:"https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1000&q=85", pinterest:"misty waterfall painting"},
  {title:"Open Fields", category:"Meadows", image:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85", pinterest:"peaceful meadow landscape painting"}
];

let currentIndex = 0;
let activeCategory = "All scenes";
let voiceActive = false;
let recordingLoop = false;
let audioContext = null;
let micStream = null;
let audioSource = null;
let audioProcessor = null;
let muteNode = null;
let activeRecording = null;
let toastTimer = null;
let lastCommand = "";
let lastCommandAt = 0;
const CONFIDENCE_THRESHOLD = 0.75;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function setStatus(message, state="ready") {
  statusText.textContent = message;
  galleryVoiceStatus.textContent = message;
  statusDot.className = "status-dot" + (state === "busy" ? " busy" : state === "error" ? " error" : "");
}
function visibleIndexes() {
  const ids = artworks.map((a, i) => ({a, i})).filter(({a}) => activeCategory === "All scenes" || a.category === activeCategory);
  return ids.map(x => x.i);
}
function renderCategories() {
  categoryBar.innerHTML = "";
  categories.forEach(category => {
    const btn = document.createElement("button");
    btn.className = "category-chip" + (category === activeCategory ? " active" : "");
    btn.textContent = category;
    btn.addEventListener("click", () => {
      activeCategory = category;
      currentIndex = 0;
      renderCategories();
      renderWall();
    });
    categoryBar.appendChild(btn);
  });
}
function renderWall() {
  const indexes = visibleIndexes();
  if (!indexes.length) return;
  if (currentIndex < 0) currentIndex = indexes.length - 1;
  if (currentIndex >= indexes.length) currentIndex = 0;
  // Render a 3-by-3 window around the current artwork.
  // LEFT/RIGHT move one column; UP/DOWN move one row (three artworks).
  const shown = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const offset = row * 3 + col;
      const index = ((currentIndex + offset) % indexes.length + indexes.length) % indexes.length;
      shown.push({ realIndex: indexes[index], selected: row === 0 && col === 0 });
    }
  }
  paintingWall.innerHTML = "";
  shown.forEach(({realIndex, selected}) => {
    const art = artworks[realIndex];
    const card = document.createElement("article");
    card.className = "art-card" + (selected ? " selected" : "");
    const imgWrap = document.createElement("div");
    imgWrap.className = "art-image-wrap";
    const img = document.createElement("img");
    img.className = "art-image";
    img.src = art.image;
    img.alt = `${art.title}, ${art.category} landscape`;
    img.loading = "lazy";
    img.onerror = () => { imgWrap.style.background = "linear-gradient(135deg,#31465a,#916d58)"; img.style.display = "none"; };
    const idx = document.createElement("span");
    idx.className = "art-index";
    idx.textContent = String(realIndex + 1).padStart(2, "0");
    imgWrap.append(img, idx);
    const details = document.createElement("div");
    details.className = "art-details";
    const text = document.createElement("div");
    text.style.minWidth = "0";
    const title = document.createElement("div");
    title.className = "art-title";
    title.textContent = art.title;
    const cat = document.createElement("div");
    cat.className = "art-category";
    cat.textContent = art.category;
    text.append(title, cat);
    const link = document.createElement("a");
    link.className = "pinterest-link";
    link.href = "https://www.pinterest.com/search/pins/?q=" + encodeURIComponent(art.pinterest);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Pinterest ↗";
    link.addEventListener("click", e => e.stopPropagation());
    details.append(text, link);
    card.append(imgWrap, details);
    card.addEventListener("click", () => {
      currentIndex = indexes.indexOf(realIndex);
      renderWall();
    });
    paintingWall.appendChild(card);
  });
  positionLabel.textContent = `Painting ${String(currentIndex + 1).padStart(2,"0")} / ${String(indexes.length).padStart(2,"0")}`;
}
function openGallery() {
  magicBox.classList.add("open");
  setTimeout(() => {
    entrance.classList.remove("active");
    gallery.classList.add("active");
    renderCategories();
    renderWall();
  }, 480);
  showToast("The box is opening… welcome to Wonderwall.");
}
function closeGallery() {
  gallery.classList.remove("active");
  entrance.classList.add("active");
  magicBox.classList.remove("open");
  showToast("The box is closed. Say ON whenever you're ready.");
}
function move(direction) {
  const indexes = visibleIndexes();
  const delta = direction === "left" ? -1
    : direction === "right" ? 1
    : direction === "up" ? -3
    : 3;
  currentIndex = ((currentIndex + delta) % indexes.length + indexes.length) % indexes.length;
  renderWall();
  const art = artworks[indexes[currentIndex]];
  showToast(`${direction.toUpperCase()} · ${art.title}`);
}
function executeCommand(result) {
  const label = result.label;
  const confidence = result.confidence;
  if (confidence < CONFIDENCE_THRESHOLD) {
    setStatus(`Not sure (${Math.round(confidence*100)}%). Try again.`, "error");
    return;
  }
  const now = Date.now();
  // Avoid accidental repeated navigation from nearly identical adjacent audio chunks.
  if (label === lastCommand && now - lastCommandAt < 1400) return;
  lastCommand = label;
  lastCommandAt = now;

  if (label === "Open_Box") {
    if (!gallery.classList.contains("active")) openGallery();
    else showToast("The gallery is already open.");
  } else if (label === "Close_Box") {
    if (gallery.classList.contains("active")) closeGallery();
    else showToast("The box is already closed.");
  } else if (["Left","Right","Up","Down"].includes(label)) {
    if (!gallery.classList.contains("active")) {
      showToast("Say ON first to open the gallery.");
      return;
    }
    move(label.toLowerCase());
  }
  setStatus(`Heard “${result.command}” · ${Math.round(confidence*100)}% confidence`);
}

async function checkHealth() {
  try {
    const response = await fetch("/health");
    const data = await response.json();
    connectionText.textContent = data.model_exists ? "Voice model connected" : "Model file missing";
    if (!data.model_exists) showToast("Copy the downloaded .keras model beside app.py.");
  } catch {
    connectionText.textContent = "Backend unavailable";
  }
}

// Encode one second of mono float samples as 16 kHz, 16-bit PCM WAV.
function encodeWav(samples, sampleRate=16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  }
  writeString(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE"); writeString(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
  }
  return new Blob([buffer], {type:"audio/wav"});
}
function resample(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, input.length - 1);
    const frac = pos - left;
    output[i] = input[left] * (1 - frac) + input[right] * frac;
  }
  return output;
}

async function startMicrophone() {
  if (micStream && audioContext && audioContext.state !== "closed") {
    await audioContext.resume();
    return;
  }

  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    audioContext = new AudioContextClass();
    await audioContext.resume();

    audioSource = audioContext.createMediaStreamSource(micStream);
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    muteNode = audioContext.createGain();
    muteNode.gain.value = 0;

    audioProcessor.onaudioprocess = event => {
      const recording = activeRecording;
      if (!recording) return;

      const chunk = new Float32Array(
        event.inputBuffer.getChannelData(0)
      );

      recording.chunks.push(chunk);
      recording.totalSamples += chunk.length;

      if (recording.totalSamples >= recording.targetSamples) {
        activeRecording = null;
        clearTimeout(recording.timer);

        const full = new Float32Array(recording.totalSamples);
        let offset = 0;

        recording.chunks.forEach(part => {
          full.set(part, offset);
          offset += part.length;
        });

        const oneSecond = full.slice(0, recording.targetSamples);
        const samples16k = resample(
          oneSecond,
          audioContext.sampleRate,
          16000
        );

        recording.resolve(encodeWav(samples16k, 16000));
      }
    };

    audioSource.connect(audioProcessor);
    audioProcessor.connect(muteNode);
    muteNode.connect(audioContext.destination);

    // Keep the same microphone stream open between commands.
    micStream.getAudioTracks().forEach(track => {
      track.onended = () => {
        if (voiceActive) {
          voiceActive = false;
          startVoiceText.textContent = "Start voice control";
          setStatus("Microphone disconnected.", "error");
          stopMicrophone();
        }
      };
    });
  } catch (error) {
    stopMicrophone();
    throw error;
  }
}

function recordOneSecond() {
  if (!voiceActive || !audioContext || !micStream) {
    return Promise.reject(new Error("Microphone is not active."));
  }

  if (activeRecording) {
    return Promise.reject(new Error("A recording is already in progress."));
  }

  return new Promise((resolve, reject) => {
    const recording = {
      chunks: [],
      totalSamples: 0,
      targetSamples: audioContext.sampleRate,
      resolve,
      reject,
      timer: null
    };

    activeRecording = recording;

    recording.timer = setTimeout(() => {
      if (activeRecording === recording) {
        activeRecording = null;
        reject(new Error("Recording timed out. Please try again."));
      }
    }, 5000);
  });
}

function stopMicrophone() {
  if (activeRecording) {
    const recording = activeRecording;
    activeRecording = null;
    clearTimeout(recording.timer);
    recording.reject(new Error("Voice control stopped."));
  }

  if (audioProcessor) {
    audioProcessor.onaudioprocess = null;
    try { audioProcessor.disconnect(); } catch {}
    audioProcessor = null;
  }

  if (audioSource) {
    try { audioSource.disconnect(); } catch {}
    audioSource = null;
  }

  if (muteNode) {
    try { muteNode.disconnect(); } catch {}
    muteNode = null;
  }

  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  if (audioContext) {
    const oldContext = audioContext;
    audioContext = null;
    oldContext.close().catch(() => {});
  }
}

async function sendRecording() {
  try {
    setStatus("Listening for your command…", "busy");

    const wav = await recordOneSecond();
    if (!voiceActive) return;

    setStatus("Recognizing your command…", "busy");

    const form = new FormData();
    form.append("audio", wav, "command.wav");

    const response = await fetch("/predict", {
      method: "POST",
      body: form
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Prediction failed.");
    }

    if (voiceActive) executeCommand(result);
  } catch (error) {
    // Stopping voice control intentionally is not an error.
    if (!voiceActive) return;

    console.error(error);
    setStatus(error.message || "Microphone or model error.", "error");
    showToast(error.message || "Could not process audio.");

    voiceActive = false;
    startVoiceText.textContent = "Start voice control";
    stopMicrophone();
  }
}

async function voiceLoop() {
  if (!voiceActive || recordingLoop) return;

  recordingLoop = true;

  try {
    while (voiceActive) {
      await sendRecording();

      // Brief pause after each prediction; microphone stays open.
      if (voiceActive) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } finally {
    recordingLoop = false;
  }
}

startVoiceBtn.addEventListener("click", async () => {
  if (voiceActive) {
    voiceActive = false;
    startVoiceText.textContent = "Start voice control";
    setStatus("Voice control paused.");
    showToast("Voice control paused.");
    stopMicrophone();
    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    showToast("Microphone access needs HTTPS or localhost.");
    return;
  }

  voiceActive = true;
  startVoiceText.textContent = "Stop voice control";
  setStatus("Starting microphone…", "busy");

  try {
    await startMicrophone();

    if (!voiceActive) {
      stopMicrophone();
      return;
    }

    setStatus("Voice control is on — say a command.", "busy");
    showToast(
      "Voice control is on. Say ON, OFF, LEFT, RIGHT, UP or DOWN."
    );

    voiceLoop();
  } catch (error) {
    console.error(error);
    voiceActive = false;
    startVoiceText.textContent = "Start voice control";
    setStatus("Could not start microphone.", "error");
    showToast(error.message || "Could not start microphone.");
    stopMicrophone();
  }
});

document.getElementById("openWithClick").addEventListener("click", openGallery);
document.getElementById("closeBox").addEventListener("click", closeGallery);
document.getElementById("moveLeft").addEventListener("click", () => move("left"));
document.getElementById("moveRight").addEventListener("click", () => move("right"));
document.getElementById("moveUp").addEventListener("click", () => move("up"));
document.getElementById("moveDown").addEventListener("click", () => move("down"));
document.getElementById("moveLeftSmall").addEventListener("click", () => move("left"));
document.getElementById("moveRightSmall").addEventListener("click", () => move("right"));
checkHealth();
