import { useState, useEffect, useRef } from "react";
import {
  connectSocket,
  sendSocketMessage,
  closeSocket,
} from "../services/socket";
import {
  initStudentConnection,
  setMicState,
  handleWebRTCSignal,
} from "../services/webrtc";
import { toast } from "sonner";
import { Mic, MicOff, Hand, XCircle, Hourglass, Loader, Ban } from "lucide-react";
import Header from "./Header";
import SpeakingIndicator from "./ui/SpeakingIndicator";
import Mascot from "./Mascot";

/**
 * StatusPage Component
 *
 * A reusable full-page overlay for displaying status messages (e.g., disconnected, waiting).
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - The icon to display.
 * @param {string} props.title - The main status title.
 * @param {React.ReactNode} props.children - Additional description or content.
 */
function StatusPage({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center flex-grow bg-muted text-center p-4 w-full">
      <div className="text-6xl text-muted-foreground mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <div className="text-muted-foreground mt-1">{children}</div>
    </div>
  );
}

/**
 * StudentView Component (Client)
 *
 * The main interface for students to interact with the PTT session.
 * Handles:
 * - WebSocket connection and signaling
 * - WebRTC audio streaming
 * - PTT button logic (Request, Talk, Release)
 * - Queue management and cooldowns
 * - Audio level visualization
 * - Mascot integration
 */
export default function Client({ user, isDark, toggleTheme, role }) {
  // --- Session State ---
  const [statusText, setStatusText] = useState("Connecting...");
  const [sessionActive, setSessionActive] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [hasFloor, setHasFloor] = useState(false);

  // --- Queue & Cooldown State ---
  const [isRequesting, setIsRequesting] = useState(false); // Transient loading state
  const [isInQueue, setIsInQueue] = useState(false); // Persistent queue state
  const [isRequestedCooldown, setIsRequestedCooldown] = useState(false); // Cooldown AFTER canceling
  const [isReleaseCooldown, setIsReleaseCooldown] = useState(false); // Cooldown AFTER releasing floor
  const [cancelCooldownTimer, setCancelCooldownTimer] = useState(0); // For countdown display

  // --- Audio & Connection State ---
  const [isTalking, setIsTalking] = useState(false);
  const [bannedError, setBannedError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);

  // Refs for accessing state inside callbacks/intervals
  const lastReleasedRef = useRef(0);
  const currentSpeakerRef = useRef(null);

  // Sync ref with currentSpeaker state
  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  // --- Cancel Countdown Effect ---
  // Manages the countdown timer display after a request is cancelled
  useEffect(() => {
    let timerId;
    if (cancelCooldownTimer > 0) {
      setStatusText(`Request cancelled. Cooldown ${cancelCooldownTimer}s.`);
      timerId = setTimeout(() => {
        setCancelCooldownTimer((prev) => prev - 1);
      }, 1000);
    } else if (cancelCooldownTimer === 0) {
      // Restore status text after countdown finishes
      const speaker = currentSpeakerRef.current;
      if (speaker?.uid === user.uid) {
        setStatusText("You have the floor!");
      } else if (speaker) {
        setStatusText(`${speaker.name || "Someone"} is speaking...`);
      } else {
        setStatusText("Floor is open");
      }
    }
    return () => clearTimeout(timerId);
  }, [cancelCooldownTimer, isRequestedCooldown, user.uid]);

  // --- Mascot Visibility State ---
  const [showMascot, setShowMascot] = useState(() => {
    const saved = localStorage.getItem("showMascot");
    return saved !== "false"; // Default to true
  });

  const toggleMascot = () => {
    setShowMascot((prev) => {
      const newValue = !prev;
      localStorage.setItem("showMascot", newValue);
      return newValue;
    });
  };

  // --- Audio Permission Helper ---
  // Returns true if audio is ready, false if permission/device failed.
  // This is called on every button press to handle "Device Unplugged".
  const checkAudioReady = async () => {
    // 1. Check if we already have a live stream
    if (
      micStream &&
      micStream.active &&
      micStream.getAudioTracks().length > 0
    ) {
      const track = micStream.getAudioTracks()[0];
      if (track.readyState === "live") {
        return true;
      }
    }

    // 2. Try to get a new stream
    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // If we are currently connected/active, ensure WebRTC knows about it
      if (sessionActive && isConnected) {
        initStudentConnection(user.uid);
      }
      setStatusText("Microphone connected.");
      return true;
    } catch (err) {
      console.error("[Audio] Permission Check Failed:", err);
      setStatusText("Microphone Error: Please check your device.");
      return false;
    }
  };

  // --- WebSocket and WebRTC Effects ---
  // Manages the lifecycle of socket connection and audio stream setup
  useEffect(() => {
    let isMounted = true;

    // Get microphone access immediately
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (isMounted) {
          setMicStream(stream);
        }
      })
      .catch((e) => {
        if (isMounted) {
          console.error(
            "Microphone access was denied or blocked (Safari requires gesture).",
            e
          );
          setStatusText(
            "Microphone access needed. Click 'Request to Speak' or Interact to enable."
          );
        }
      });

    // Authenticate and connect socket
    user.getIdToken().then((token) => {
      if (!isMounted) return;

      connectSocket(
        token,
        (msg) => {
          if (!isMounted) return;

          switch (msg.type) {
            case "system-session-status":
              setSessionActive(msg.payload.active);
              if (msg.payload.active) {
                setStatusText("Connected to session");
                initStudentConnection(user.uid);
              } else {
                setStatusText("Waiting for the lecturer to start...");
              }
              break;
            case "system-speaker-update":
              const speaker = msg.payload.speaker;
              setCurrentSpeaker(speaker);
              const isMe = speaker?.uid === user.uid;
              setHasFloor(isMe);

              // Enforce Mute if we lost the floor
              if (!isMe) {
                setIsTalking(false);
                setMicState(false);
              }

              if (isMe) {
                setStatusText("You have the floor!");
                setIsInQueue(false); // Clean up queue state if we got floor
                setIsRequesting(false);
              } else if (speaker) {
                // Only update text if we are not showing a countdown
                if (cancelCooldownTimer === 0) {
                  setStatusText(`${speaker.name || "Someone"} is speaking...`);
                }
              } else {
                if (cancelCooldownTimer === 0) {
                  setStatusText("Floor is open");
                }
              }
              break;
            case "system-speak-granted":
              setHasFloor(true);
              setIsInQueue(false);
              setIsRequesting(false);
              setStatusText("You have the floor!");
              break;
            case "system-request-acknowledged":
              setIsInQueue(true);
              setIsRequesting(false);
              setStatusText("You have notified the lecturer to speak");
              break;
            case "system-request-cancelled":
              setIsInQueue(false);
              setIsRequesting(false);
              setCancelCooldownTimer(3); // Start Countdown

              // Trigger 3s Cooldown Logic
              setIsRequestedCooldown(true);
              setTimeout(() => {
                if (isMounted) setIsRequestedCooldown(false);
              }, 3000);
              break;
            case "system-request-removed":
              setIsInQueue(false);
              setIsRequesting(false);
              setStatusText("Removed from queue by lecturer.");
              toast.info("You were removed from the request queue.");
              break;
            case "system-floor-busy":
              setIsRequesting(false);
              setStatusText("The floor is currently busy.");
              break;
            case "webrtc-answer":
            case "webrtc-ice-candidate":
              handleWebRTCSignal(msg.type, msg.payload);
              break;
            case "system-error":
              setIsRequesting(false);
              if (msg.payload.includes("kicked")) {
                setBannedError(msg.payload);
              } else {
                toast.error(`Error: ${msg.payload}`, {
                  duration: 4000,
                  icon: "⚠️"
                });
              }
              break;
          }
        },
        () => {
          if (isMounted) {
            setIsConnected(false);
            setStatusText("Disconnected");
          }
        }, // onDisconnect
        () => {
          if (isMounted) {
            setIsConnected(true);
            setStatusText("Connected");
          }
        }, // onOpen
        (error) => {
          if (isMounted) {
            console.error("[ERROR] [Client] Socket error:", error);
            setStatusText(
              "Connection Failed. Please check your network or refresh."
            );
          }
        } // onError
      );
    });

    return () => {
      isMounted = false;
      closeSocket();
    };
  }, [user]);

  // --- Connection Timeout Logic ---
  useEffect(() => {
    let timeoutId;
    if (!isConnected) {
      timeoutId = setTimeout(() => {
        setStatusText("Connection timed out. Please refresh the page.");
      }, 10000);
    }
    return () => clearTimeout(timeoutId);
  }, [isConnected]);

  // --- Local Audio Level Analysis ---
  // Analyzes mic stream to provide visual feedback (SpeakingIndicator)
  useEffect(() => {
    if (!micStream || !isTalking) {
      setLocalAudioLevel(0);
      return;
    }

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(micStream);
    source.connect(analyser);

    // Configure analyser
    analyser.fftSize = 32;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId;

    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
      // Heuristic to map raw audio level to a 0-100 scale for the UI
      const level = Math.min(100, (average / 80) * 100);
      setLocalAudioLevel(level);
      animationFrameId = requestAnimationFrame(updateAudioLevel);
    };

    animationFrameId = requestAnimationFrame(updateAudioLevel);

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      // Use a timeout to avoid a race condition error in Firefox
      setTimeout(() => audioContext.close(), 500);
    };
  }, [micStream, isTalking]);

  // --- PTT Interaction Handlers ---

  const handlePress = async () => {
    // Check Mic Status on every press
    const isReady = await checkAudioReady();
    if (!isReady) return;

    if (hasFloor) {
      if (setMicState(true)) {
        setIsTalking(true);
        sendSocketMessage("speaking-started");
        setStatusText("You are talking...");
      } else {
        setStatusText("Audio not ready yet... Please wait a moment.");
      }
    } else {
      // Prevent action if in release cooldown
      if (isReleaseCooldown) {
        toast.warning("Please wait 3 seconds before requesting again.");
        return;
      }

      // Prevent action if in request cooldown
      if (isRequestedCooldown) {
        toast.warning("Please wait 3 seconds before requesting again.");
        return;
      }

      // If floor is busy, prevent accidental double clicks or re-queuing
      if (currentSpeaker && (isRequesting || isInQueue)) return;

      // If floor is OPEN, we allow press even if isInQueue (Race to speak)

      setIsRequesting(true);
      sendSocketMessage("request-to-speak");
    }
  };

  const handleRelease = () => {
    if (hasFloor && isTalking) {
      setIsTalking(false);
      setMicState(false);
      sendSocketMessage("finished-speaking");
      setStatusText("You stopped speaking (Floor still held).");
    }
  };

  const handleYieldFloor = () => {
    sendSocketMessage("release-floor");
    setHasFloor(false);
    setIsTalking(false);
    setMicState(false);
    setStatusText("You yielded the floor.");
    lastReleasedRef.current = Date.now();

    // Trigger Release Cooldown
    setIsReleaseCooldown(true);
    setTimeout(() => {
      setIsReleaseCooldown(false);
    }, 3000);
  };

  const handleCancelRequest = () => {
    sendSocketMessage("cancel-request");
    // UI update happens on 'system-request-cancelled'
  };

  // --- Render Logic ---

  // 1. Banned State
  if (bannedError) {
    return (
      <div className="flex flex-col flex-1 h-full font-sans">
        <Header
          user={user}
          isDark={isDark}
          toggleTheme={toggleTheme}
          role={role}
        />
        <StatusPage icon={<XCircle />} title="Access Denied">
          <p>{bannedError}</p>
        </StatusPage>
      </div>
    );
  }

  // 2. Waiting State (Connected but session not started)
  if (isConnected && !sessionActive) {
    return (
      <div className="flex flex-col h-screen font-sans">
        <Header
          user={user}
          isDark={isDark}
          toggleTheme={toggleTheme}
          role={role}
        />
        <StatusPage
          icon={<Hourglass />}
          title="The Session Has Not Started Yet"
        >
          <p>Please wait for the lecturer to begin.</p>
        </StatusPage>
      </div>
    );
  }

  // 3. Disconnected / Connecting State
  if (!isConnected) {
    return (
      <div className="flex flex-col h-screen font-sans">
        <Header
          user={user}
          isDark={isDark}
          toggleTheme={toggleTheme}
          role={role}
        />
        <StatusPage
          icon={<Loader className="animate-spin" />}
          title={
            statusText === "Disconnected" ? "Connecting..." : "Connecting..."
          }
        >
          <p>{statusText}</p>
        </StatusPage>
      </div>
    );
  }

  // 4. Main Interface (Active Session)
  
  // Determine Button Appearance based on state
  let buttonClass = "bg-ptt-inactive";
  let buttonIcon = <Hand className="w-16 h-16 items-center" />;
  let buttonText = "Busy";
  let isDisabled = true;
  let showCancel = false;

  if (isTalking) {
    buttonClass = "bg-ptt-inuse animate-pulse";
    buttonIcon = <MicOff className="w-16 h-16" />;
    buttonText = "Release to Mute";
    isDisabled = false;
  } else if (hasFloor) {
    buttonClass = "bg-ptt-active";
    buttonIcon = <Mic className="w-16 h-16" />;
    buttonText = "Hold to Talk";
    isDisabled = false;
  } else if (!currentSpeaker) {
    // Floor Open - Prioritize PTT regardless of queue state
    buttonClass = "bg-ptt-request";
    buttonIcon = <Hand className="w-16 h-16" />;
    buttonText = "Request to Speak";
    isDisabled = false;
  } else {
    // Floor Busy
    if (isInQueue) {
      buttonClass = "bg-ptt-request opacity-80 cursor-wait";
      buttonIcon = <Loader className="w-16 h-16 animate-spin" />;
      buttonText = "Requested";
      isDisabled = true;
      showCancel = true;
    } else if (isRequesting) {
      buttonClass = "bg-ptt-request opacity-80 animate-pulse";
      buttonIcon = <Loader className="w-16 h-16 animate-spin" />;
      buttonText = "Sending...";
      isDisabled = true;
    } else if (isRequestedCooldown || isReleaseCooldown) {
      buttonClass = "bg-gray-400 cursor-not-allowed";
      buttonIcon = <Ban className="w-16 h-16" />;
      buttonText = "Wait...";
      isDisabled = true;
    } else {
      // Not in queue, floor busy -> Can request
      buttonClass = "bg-ptt-request opacity-90";
      buttonIcon = <Hand className="w-16 h-16" />;
      buttonText = "Request to Speak";
      isDisabled = false;
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-auto font-sans">
      <Header
        user={user}
        isDark={isDark}
        toggleTheme={toggleTheme}
        role={role}
        showMascot={showMascot}
        toggleMascot={toggleMascot}
      />

      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
        <SpeakingIndicator isSpeaking={isTalking} audioLevel={localAudioLevel}>
          <button
            className={`flex flex-col items-center justify-center w-64 h-64 rounded-full text-white shadow-lg transition-all duration-200 transform focus:outline-none ${isDisabled
              ? "cursor-not-allowed opacity-70"
              : "hover:scale-105 active:scale-95"
              } ${buttonClass}`}
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            onTouchStart={(e) => {
              e.preventDefault();
              handlePress();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleRelease();
            }}
            disabled={isDisabled}
          >
            <div className="select-none flex flex-col items-center">
              {buttonIcon}
              <p className="mt-2 text-xl font-semibold tracking-wide">
                {buttonText}
              </p>
            </div>
          </button>
        </SpeakingIndicator>

        {/* Release Floor Button (When holding floor) */}
        {hasFloor && (
          <button
            onClick={handleYieldFloor}
            className="mt-6 px-6 py-2 bg-destructive/10 text-destructive border border-destructive/50 rounded-full hover:bg-destructive/20 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Release Floor
          </button>
        )}

        {/* Cancel Request Button (When in queue and floor busy) */}
        {showCancel && !hasFloor && (
          <button
            onClick={handleCancelRequest}
            className="mt-6 px-6 py-2 bg-orange-500/10 text-orange-600 border border-orange-500/50 rounded-full hover:bg-orange-500/20 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Cancel Request
          </button>
        )}

        <div className="mt-8 text-lg text-muted-foreground h-8">
          {statusText}
        </div>
      </main>

      <footer className="p-4 text-center text-sm text-muted-foreground">
        Logged in as {user.email}
      </footer>
      {showMascot && (
        <Mascot userHasFloor={hasFloor} userIsTalking={isTalking} />
      )}
    </div>
  );
}