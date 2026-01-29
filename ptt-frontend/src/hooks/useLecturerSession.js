/*
Connection Management:
- Handles connecting to the WebSocket server (connectSocket),
  registering the user as a host (register-as-host),
  and initializing WebRTC host mode (initHostMode).

State Management: Maintains the state for:
- speaker: The current active speaker.
- participants: List of connected students.
- requestQueue: List of students waiting to speak.
- remoteStreams & audioLevels: WebRTC audio streams and volume levels for visualization.
- bannedList: Users kicked from the session.
- connectionStatus: Connection health (Live, Disconnected, etc.).

Event Handling:
- Listens for WebSocket messages
  (e.g., system-student-request, system-speaker-update)
  and updates the state accordingly.

Notifications:
- Triggers UI toasts (sonner) and plays a subtle sound when students request to speak.

Actions:
- Exports functions for lecturer actions like handleKick (ban user),
  handleRemoveRequest (deny speak request), handleUnban, and handleForceRelease (mute current speaker).

This hook allows the LecturerLayout (and its children) to remain focused on UI rendering while this hook handles the complex real-time logic.
*/

import { useState, useEffect, useCallback } from "react";
import {
  connectSocket,
  sendSocketMessage,
  closeSocket,
} from "../services/socket";
import {
  initHostMode,
  handleWebRTCSignal,
  closeAllConnections,
  setStreamCallbacks,
} from "../services/webrtc";
import { toast } from "sonner"; // Import Sonner for toast notifications

// --- Helper: Notification Sound ---
// Plays a subtle "ding" sound using the Web Audio API to notify the lecturer of events (e.g., student requests).
const playNotificationSound = () => {
  // Respect user preference for sound
  const soundEnabled =
    localStorage.getItem("lecturer_sound_enabled") !== "false";
  if (!soundEnabled) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Sound configuration: Sine wave at C6 (1046.50 Hz)
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, now);

    // Envelope: Fast attack, exponential decay for a pleasant "ping"
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);

    // Cleanup audio context after playback
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch (e) {
    // Silently fail if autoplay policy blocks the sound
  }
};

/**
 * Custom hook to manage the lecturer's session state, including socket connection,
 * WebRTC streams, participant lists, and administrative actions.
 *
 * @param {object} user - The authenticated user object (Firebase).
 * @returns {object} - Session state and action handlers.
 */
export function useLecturerSession(user) {
  // --- State Management ---
  const [speaker, setSpeaker] = useState(null);
  const [lanIP, setLanIP] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [audioLevels, setAudioLevels] = useState({});
  const [participants, setParticipants] = useState([]);
  const [requestQueue, setRequestQueue] = useState([]);
  const [bannedList, setBannedList] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [kickingUid, setKickingUid] = useState(null); // ID of user currently being kicked (for UI feedback)
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // --- Socket & WebRTC Connection Logic ---
  useEffect(() => {
    if (!user) return;

    // Register callbacks for WebRTC stream events (add, remove, audio level update)
    setStreamCallbacks(
      (uid, stream) => setRemoteStreams((prev) => ({ ...prev, [uid]: stream })),
      (uid) =>
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        }),
      (uid, level) => setAudioLevels((prev) => ({ ...prev, [uid]: level })),
    );

    // Authenticate and connect via WebSocket
    user.getIdToken().then((token) => {
      connectSocket(
        token,
        (message) => {
          setIsConnected(true);
          setConnectionStatus("Live");

          // Handle incoming socket messages
          switch (message.type) {
            case "system-welcome":
              if (message.payload.serverIP) setLanIP(message.payload.serverIP);
              // Register this client as the host/lecturer
              sendSocketMessage("register-as-host");
              sendSocketMessage("register-as-host"); // Redundant call kept for existing protocol consistency
              initHostMode();
              break;

            case "system-student-request":
              // Notification for student speaking request
              const studentName = message.payload.name || message.payload.email;
              toast.info(`${studentName} requested to speak`, {
                duration: 4000,
                icon: "✋",
              });
              playNotificationSound();
              break;

            case "system-request-queue":
              setRequestQueue(message.payload.queue || []);
              break;

            case "system-speaker-update":
              setSpeaker(message.payload.speaker);
              break;

            case "system-participant-list":
              setParticipants(message.payload.participants || []);
              break;

            case "system-banned-list":
              setBannedList(message.payload.bannedList || []);
              break;

            case "webrtc-offer":
            case "webrtc-answer":
            case "webrtc-ice-candidate":
              handleWebRTCSignal(message.type, message.payload, message.from);
              break;

            case "system-error":
              toast.error(`Error: ${message.payload}`);
              break;
          }
        },
        // On Disconnect
        () => {
          setIsConnected(false);
          setConnectionStatus("Disconnected");
        },
        // On Connect
        () => {
          setIsConnected(true);
          setConnectionStatus("Live");
        },
        // On Error
        (error) => {
          console.error("Lecturer socket error:", error);
          setConnectionStatus("Connection Error");
        },
      );
    });

    // Cleanup on unmount: close connections
    return () => {
      closeAllConnections();
      closeSocket();
    };
  }, [user]);

  // --- Session Timer Logic ---
  // Tracks when the session started (connected) to potentially display duration.
  useEffect(() => {
    if (isConnected && !sessionStartTime) {
      setSessionStartTime(Date.now());
    } else if (!isConnected && sessionStartTime) {
      setSessionStartTime(null);
    }
  }, [isConnected, sessionStartTime]);

  // --- Connection Timeout Logic ---
  // Warns the user if the connection takes too long to establish.
  useEffect(() => {
    let timer;
    if (!isConnected) {
      timer = setTimeout(() => {
        setConnectionStatus("Connection timed out. Please refresh.");
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [isConnected]);

  // --- Audio Stream Cleanup Logic ---
  // Ensures we don't hold onto streams for participants who have left.
  useEffect(() => {
    setRemoteStreams((prev) => {
      const next = { ...prev };
      let changed = false;
      const currentUids = new Set(participants.map((p) => p.uid));
      Object.keys(next).forEach((uid) => {
        if (!currentUids.has(uid)) {
          delete next[uid];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [participants]);

  // --- Administrative Actions ---

  // Kick a user from the session
  const handleKick = useCallback((uid) => {
    setKickingUid(uid);
    sendSocketMessage("admin-kick-user", { uid });
    // Reset local kicking state after a brief delay for UI feedback
    setTimeout(() => setKickingUid(null), 1000);
  }, []);

  // Remove a student's request to speak
  const handleRemoveRequest = useCallback((uid) => {
    sendSocketMessage("admin-remove-request", { uid });
  }, []);

  // Unban a previously kicked user
  const handleUnban = useCallback((uid) => {
    sendSocketMessage("admin-unkick-user", { uid });
  }, []);

  // Forcefully end the current speaker's turn
  const handleForceRelease = useCallback(() => {
    sendSocketMessage("admin-release-floor");
  }, []);

  return {
    speaker,
    lanIP,
    remoteStreams,
    audioLevels,
    participants,
    requestQueue,
    bannedList,
    isConnected,
    connectionStatus,
    kickingUid,
    sessionStartTime,
    handleKick,
    handleRemoveRequest,
    handleUnban,
    handleForceRelease,
  };
}
