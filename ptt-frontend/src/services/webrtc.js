import { sendSocketMessage } from "./socket";

const peers = new Map();
let localStream = null;
let isHostMode = false;

// ICE Candidate Buffer
const iceQueues = new Map();

// Audio Context & Nodes
let audioContext = null;
let vadNode = null;
let micSource = null;
let destinationNode = null;
let gainNode = null;

let onStreamAdded = null;
let onStreamRemoved = null;
let onVolumeChange = null;

let statsInterval = null;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// --- REGISTER CALLBACKS ---
export const setStreamCallbacks = (addCb, removeCb, volCb) => {
  onStreamAdded = addCb;
  onStreamRemoved = removeCb;
  onVolumeChange = volCb;
};

// --- 1. CLEANUP ---
export const closeAllConnections = () => {

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  peers.forEach((pc) => pc.close());
  peers.clear();
  iceQueues.clear();
};

// --- 2. HOST MODE ---
export const initHostMode = () => {
  closeAllConnections();
  isHostMode = true;

};

// --- 3. STUDENT MODE ---
export const initStudentConnection = async (myUid) => {
  closeAllConnections();
  isHostMode = false;


  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Parallelize getting media and adding module
    const [rawMicStream, _] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
        },
        video: false,
      }),
      // IMPORTANT: Make sure this file exists in /public/vad-processor.js
      audioContext.audioWorklet.addModule("/vad-processor.js")
    ]);

    // 2. Create Nodes
    micSource = audioContext.createMediaStreamSource(rawMicStream);
    vadNode = new AudioWorkletNode(audioContext, "vad-processor");
    destinationNode = audioContext.createMediaStreamDestination();

    // Gain Node (Boost)
    gainNode = audioContext.createGain();
    gainNode.gain.value = 2.0;

    // --- FILTERS ---
    const highPass = audioContext.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 150;

    const lowPass = audioContext.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 4000;

    // 3. Connect Chain:
    // Mic -> Filters -> GAIN (Boost) -> VAD -> WebRTC
    micSource.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(gainNode);
    gainNode.connect(vadNode);
    vadNode.connect(destinationNode);

    // 4. Visualizer
    vadNode.port.onmessage = (event) => {
      // Pass volume AND threshold to the callback
      if (onVolumeChange) {
        onVolumeChange("me", {
          volume: event.data.volume,
          threshold: event.data.threshold,
        });
      }
    };

    // 5. Setup WebRTC
    const processedStream = destinationNode.stream;
    processedStream.getAudioTracks()[0].enabled = false; // Start Muted
    localStream = processedStream;

    const pc = createPeerConnection("HOST_TARGET");
    peers.set("HOST_TARGET", pc);
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSocketMessage("webrtc-offer", offer);
  } catch (err) {
    console.error("[ERROR] [Student] Audio Error:", err);
    // Alerting here causes spam in Safari if auto-play is blocked.
    // We re-throw so the UI can handle the "blocked" state gracefully.
    throw err;
  }
};

// --- 4. MIC CONTROL ---
export const setMicState = (isActive) => {
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => (track.enabled = isActive));

    // Force Resume AudioContext (Browsers sometimes sleep it)
    if (isActive && audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    } else if (isActive && audioContext && audioContext.state === "running") {
      // Sometimes just calling resume() helps even if it says running
      audioContext.resume();
    }


    return true; // Success
  }
  console.warn("[WARN] [Student] setMicState called but localStream is null (Not Ready)");
  return false; // Failed
};

// --- 5. PEER CONNECTION HELPER ---
const createPeerConnection = (targetUid) => {
  const pc = new RTCPeerConnection(rtcConfig);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSocketMessage("webrtc-ice-candidate", {
        candidate: event.candidate,
        targetUid: isHostMode ? targetUid : null,
      });
    }
  };

  if (isHostMode) {
    pc.ontrack = (event) => {

      const [remoteStream] = event.streams;
      if (onStreamAdded) onStreamAdded(targetUid, remoteStream);

      // Analyze Volume (But DO NOT play to destination here, React <audio> does that)
      monitorAudioLevel(targetUid, remoteStream);
    };
  }

  // --- Start Stats Monitoring ---
  if (!statsInterval) {
    statsInterval = setInterval(async () => {
      // Monitor the first active peer (usually there's only one relevant connection)
      const activePC = peers.values().next().value;
      if (activePC && activePC.connectionState === "connected") {
        try {
          const stats = await activePC.getStats();
          let rtt = 0;
          let jitter = 0;

          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              rtt = report.currentRoundTripTime * 1000;
            }
            if (report.type === "inbound-rtp" && report.kind === "audio") {
              jitter = report.jitter * 1000;
            }
          });

          if (rtt > 0 || jitter > 0) {
            sendSocketMessage("webrtc-stats", { rtt, jitter });
          }
        } catch (err) {
          console.warn("Stats error:", err);
        }
      }
    }, 2000);
  }

  return pc;
};

// --- 6. VISUALIZER ---
let sharedAudioContext = null;

export const getAudioContext = () => {
  if (!sharedAudioContext)
    sharedAudioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  return sharedAudioContext;
};

const monitorAudioLevel = (uid, stream) => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!peers.get(uid)) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      if (onVolumeChange) onVolumeChange(uid, avg * 2); // Boost visual
      requestAnimationFrame(checkVolume);
    };
    checkVolume();
  } catch (err) {
    console.error(`[ERROR] [Monitor] Error:`, err);
  }
};

// --- 7. SIGNALING HANDLER ---
export const handleWebRTCSignal = async (type, payload, fromUid) => {
  const pcId = isHostMode ? fromUid : "HOST_TARGET";

  if (isHostMode && type === "webrtc-offer") {
    let pc = peers.get(pcId);
    if (pc) pc.close();
    pc = createPeerConnection(pcId);
    peers.set(pcId, pc);

    await pc.setRemoteDescription(new RTCSessionDescription(payload));
    if (iceQueues.has(pcId)) {
      for (const candidate of iceQueues.get(pcId))
        await pc.addIceCandidate(candidate);
      iceQueues.delete(pcId);
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSocketMessage("webrtc-answer", { sdp: answer, targetUid: pcId });
    return;
  }

  const pc = peers.get(pcId);
  if (!pc) return;

  if (type === "webrtc-answer")
    await pc.setRemoteDescription(new RTCSessionDescription(payload));
  else if (type === "webrtc-ice-candidate") {
    if (pc.remoteDescription) await pc.addIceCandidate(payload);
    else {
      if (!iceQueues.has(pcId)) iceQueues.set(pcId, []);
      iceQueues.get(pcId).push(payload);
    }
  }
};
