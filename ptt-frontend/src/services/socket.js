// src/services/socket.js
let socket = null;

export const connectSocket = (token, onMessage, onDisconnect, onOpen, onError) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;

  const wsUrl = `${protocol}//${host}?token=${token}`;


  // Close existing socket if previously open
  if (socket) {

    socket.onclose = null;
    socket.close();
  }

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {

    startPingLoop();
    if (onOpen) onOpen();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'pong' || (data.type === 'system-speaker-update' && !data.payload.speaker)) {
        // Reduce noise
      } else {

      }

      if (data.type === 'pong') {
        handlePong();
        return;
      }

      if (onMessage) onMessage(data);
    } catch (e) {
      console.error("[ERROR] [Socket] Failed to parse JSON:", event.data);
    }
  };

  socket.onclose = (event) => {

    stopPingLoop();
    if (event.code !== 1000 && onError) {
      onError(event);
    }
    if (onDisconnect) onDisconnect();
  };

  socket.onerror = (error) => {
    console.error("[ERROR] [Socket] Error Event:", error);
    if (onError) onError(error);
  };

  return socket;
};

export const sendSocketMessage = (type, payload = {}) => {
  if (socket && socket.readyState === WebSocket.OPEN) {

    socket.send(JSON.stringify({ type, payload }));
  } else {
    console.warn("[WARN] [Socket] Cannot send message, socket not open.");
  }
};

// --- Latency Logic ---
let pingInterval = null;
let lastPingTime = 0;

const startPingLoop = () => {
  stopPingLoop();
  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      lastPingTime = Date.now();
      socket.send(JSON.stringify({ type: "ping" }));
    }
  }, 5000);
};

const stopPingLoop = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

const handlePong = () => {
  if (lastPingTime > 0) {
    const rtt = Date.now() - lastPingTime;
    sendSocketMessage("latency-update", { rtt });
    lastPingTime = 0;
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};
