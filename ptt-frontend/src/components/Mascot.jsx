import { useState, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import blinkGif from "../assets/mascot_blink-ezgif-nobg.gif";
import talkGif from "../assets/mascot_talk-ezgif-nobg.gif";

const SUGGESTIONS_GENERAL = [
  "Did you know? You can change the theme in Settings > Appearance.",
  "Etiquette: Tap 'Release Floor' immediately after you finish speaking.",
  "Click on me to see a tip!",
  "You can drag me around the screen!",
];

const SUGGESTIONS_IDLE_FLOOR = [
  "Are you talking? Please hold the button to talk",
  "Do you wish to continue talking? Else releasing the floor for others",
];

const SUGGESTIONS_SPEAKING = [
  "Tip: Hold your phone 3-5cm from your mouth for clear audio.",
  "Check your microphone permissions if you can't be heard.",
];

const MASCOT_SIZE = 80; // Width/Height of the mascot container in pixels

/**
 * Mascot component.
 *
 * Displays an interactive mascot that overlays the application.
 * Features:
 * - Draggable positioning with "snap-to-side" behavior.
 * - Context-aware suggestions (idle, speaking, general tips).
 * - Animated avatar (blinking/talking states).
 *
 * @param {boolean} userHasFloor - Whether the user currently has the speaking floor.
 * @param {boolean} userIsTalking - Whether the user is currently detecting voice input.
 */
function Mascot({ userHasFloor, userIsTalking }) {
  // --- State Management ---
  const [position, setPosition] = useState({
    x: window.innerWidth - 100,
    y: window.innerHeight - 150,
  });
  const [isTalking, setIsTalking] = useState(false);
  const [message, setMessage] = useState("");
  // Track dragging state purely for visual cursor updates
  const [isDraggingVisual, setIsDraggingVisual] = useState(false);

  // --- Refs for Performance & Mutable State ---
  // Using refs for drag logic avoids frequent re-renders and stale closure issues in event listeners.
  const isDraggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 }); // Offset from cursor to mascot top-left
  const dockSideRef = useRef("right"); // Which side (left/right) the mascot is docked to
  const hasMovedRef = useRef(false); // Distinguishes between a click and a drag
  const startClickPosRef = useRef({ x: 0, y: 0 }); // Starting position of a click/touch
  const suggestionTimeoutRef = useRef(null); // Timer for hiding the suggestion bubble
  const lastSuggestionRef = useRef(null); // Prevents showing the same suggestion twice in a row
  const prevIsTalkingRef = useRef(userIsTalking); // Tracks previous prop value for transitions

  // Ref to hold latest props for use inside setTimeout/Interval callbacks
  const stateRef = useRef({ userHasFloor, userIsTalking });
  stateRef.current = { userHasFloor, userIsTalking };

  const mascotRef = useRef(null);
  const timerRef = useRef(null); // Periodic suggestion timer
  const idleFloorTimerRef = useRef(null); // Timer for idle floor warning

  // --- Derived Layout State ---
  // Calculate relative position for the suggestion bubble popup.
  const centerX = position.x + MASCOT_SIZE / 2;
  const centerY = position.y + MASCOT_SIZE / 2;
  const isLeft = centerX < window.innerWidth / 2;
  const isTop = centerY < window.innerHeight / 2;

  // --- Suggestion Logic ---

  /**
   * Triggers a new suggestion bubble.
   * Logic selects the appropriate message category based on current user state.
   */
  const triggerSuggestion = (specificMessage = null, isClick = false) => {
    // Prevent suggestions from interrupting a drag action
    if (isDraggingRef.current) return;

    // Reset existing bubble timeout if active (debounce behavior)
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }

    let text;
    if (specificMessage) {
      text = specificMessage;
    } else {
      // Determine context-aware list based on latest state
      const { userHasFloor, userIsTalking } = stateRef.current;

      let targetList = SUGGESTIONS_GENERAL;
      if (userHasFloor) {
        if (userIsTalking) {
          targetList = SUGGESTIONS_SPEAKING;
        } else {
          targetList = SUGGESTIONS_IDLE_FLOOR;
        }
      }

      // Filter out "Click me" prompt if the user just clicked
      if (isClick && targetList === SUGGESTIONS_GENERAL) {
        targetList = targetList.filter((s) => !s.includes("Click on me"));
      }

      // Random selection loop to ensure variety (don't repeat last message)
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * targetList.length);
      } while (
        targetList.length > 1 &&
        targetList[newIndex] === lastSuggestionRef.current
      );

      text = targetList[newIndex];
    }

    lastSuggestionRef.current = text;
    setMessage(text);
    setIsTalking(true);

    // Auto-hide message after 4 seconds
    suggestionTimeoutRef.current = setTimeout(() => {
      setIsTalking(false);
      suggestionTimeoutRef.current = null;
    }, 4000);
  };

  // Cleanup all timers on component unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current)
        clearTimeout(suggestionTimeoutRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (idleFloorTimerRef.current) clearTimeout(idleFloorTimerRef.current);
    };
  }, []);

  // --- Reactive Effects ---

  // Effect: Trigger suggestion when user starts talking
  useEffect(() => {
    if (!prevIsTalkingRef.current && userIsTalking) {
      triggerSuggestion();
    }
    prevIsTalkingRef.current = userIsTalking;
  }, [userIsTalking]);

  // Effect: Monitor "Idle Floor" state (holding floor but silence)
  useEffect(() => {
    if (userHasFloor && !userIsTalking) {
      // Start a 5s timer to warn user if they are silent while holding the floor
      idleFloorTimerRef.current = setTimeout(() => {
        triggerSuggestion(); // Will pick from SUGGESTIONS_IDLE_FLOOR
      }, 5000);
    } else {
      if (idleFloorTimerRef.current) {
        clearTimeout(idleFloorTimerRef.current);
        idleFloorTimerRef.current = null;
      }
    }

    return () => {
      if (idleFloorTimerRef.current) clearTimeout(idleFloorTimerRef.current);
    };
  }, [userHasFloor, userIsTalking]);

  // Effect: Handle Window Resize
  // Ensures mascot stays visible and adheres to its docked side
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 80;

        let newY = Math.min(prev.y, maxY);

        // Snap X position to the correct side based on dock history
        let newX = prev.x;
        if (dockSideRef.current === "right") {
          newX = window.innerWidth - 100;
        } else {
          newX = 20;
        }

        return { x: newX, y: newY };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect: Periodic Background Suggestions
  // Shows a random tip every 30-60 seconds to keep the mascot "alive"
  useEffect(() => {
    const scheduleNextSuggestion = () => {
      const delay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
      timerRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          triggerSuggestion();
        }
        scheduleNextSuggestion();
      }, delay);
    };

    scheduleNextSuggestion();

    return () => clearTimeout(timerRef.current);
  }, []);

  // --- Drag & Drop Logic ---

  const handlePointerDown = (clientX, clientY) => {
    isDraggingRef.current = true;
    setIsDraggingVisual(true);
    hasMovedRef.current = false;
    startClickPosRef.current = { x: clientX, y: clientY };

    if (mascotRef.current) {
      const rect = mascotRef.current.getBoundingClientRect();
      // Calculate offset so the element doesn't "jump" to cursor center on start
      dragOffset.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }
  };

  // Global move/up listeners attached to window to handle dragging outside the component
  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (!isDraggingRef.current) return;

      let clientX, clientY;

      if (e.type.startsWith("touch")) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        e.preventDefault(); // Prevent text selection
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Threshold check: ignore micro-movements to allow for clean clicks
      if (!hasMovedRef.current) {
        const dist = Math.hypot(
          clientX - startClickPosRef.current.x,
          clientY - startClickPosRef.current.y
        );
        if (dist > 5) hasMovedRef.current = true;
      }

      const newX = clientX - dragOffset.current.x;
      const newY = clientY - dragOffset.current.y;

      // Constrain to window bounds
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;

      setPosition({
        x: Math.min(Math.max(0, newX), maxX),
        y: Math.min(Math.max(0, newY), maxY),
      });
    };

    const handleGlobalUp = (e) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDraggingVisual(false);

        // If movement was minimal, treat it as a click interaction
        if (!hasMovedRef.current) {
          triggerSuggestion(null, true);
        }

        // --- Snap Logic ---
        // Determine which side of the screen is closer and snap the mascot there.
        let clientX;
        if (e.type && e.type.startsWith("touch")) {
          clientX = e.changedTouches[0].clientX;
        } else {
          clientX = e.clientX;
        }

        const currentLeft = clientX - dragOffset.current.x;
        const currentCenterX = currentLeft + MASCOT_SIZE / 2;
        const midPoint = document.documentElement.clientWidth / 2;
        const isLeftNow = currentCenterX < midPoint;

        setPosition((prev) => {
          dockSideRef.current = isLeftNow ? "left" : "right";
          const targetX = isLeftNow ? 20 : window.innerWidth - 100;
          return { ...prev, x: targetX };
        });
      }
    };

    window.addEventListener("mousemove", handleGlobalMove, { passive: false });
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove, { passive: false });
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, []);

  const onMouseDown = (e) => {
    if (e.button !== 0) return; // Only accept left click
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    handlePointerDown(touch.clientX, touch.clientY);
  };

  // --- UI Construction ---

  // Dynamic classes for the speech bubble based on position and state
  // "Safe Side" placement: Bubble appears on the opposite side of the screen edge to avoid clipping.
  let bubbleClasses =
    "absolute w-48 bg-white text-black p-3 rounded-xl shadow-lg text-sm text-center border border-gray-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-center";

  if (isTalking) {
    bubbleClasses += " opacity-100 scale-100";
  } else {
    // Hide bubble visually and remove pointer events so clicks pass through
    bubbleClasses += " opacity-0 scale-90 pointer-events-none";
  }

  // Horizontal Alignment
  if (isLeft) {
    bubbleClasses += " left-full ml-4";
  } else {
    bubbleClasses += " right-full mr-4";
  }

  // Vertical Alignment
  if (isTop) {
    bubbleClasses += " top-0";
  } else {
    bubbleClasses += " bottom-0";
  }

  // CSS for the speech bubble arrow
  const arrowStyle = {
    position: "absolute",
    width: "12px",
    height: "12px",
    backgroundColor: "white",
    transform: "rotate(45deg)",
    zIndex: 1,
  };

  // Position arrow to connect bubble with mascot
  if (isLeft) {
    arrowStyle.left = "-6px";
    arrowStyle.borderLeft = "1px solid #e5e7eb";
    arrowStyle.borderBottom = "1px solid #e5e7eb";
  } else {
    arrowStyle.right = "-6px";
    arrowStyle.borderRight = "1px solid #e5e7eb";
    arrowStyle.borderTop = "1px solid #e5e7eb";
  }

  if (isTop) {
    arrowStyle.top = "16px";
  } else {
    arrowStyle.bottom = "16px";
  }

  return (
    <div
      ref={mascotRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 50,
        touchAction: "none",
        cursor: isDraggingVisual ? "grabbing" : "grab",
        // Disable transition during drag for direct 1:1 control
        transition: isDraggingVisual ? "none" : "left 0.3s ease-out",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="flex flex-col items-center select-none"
      role="button"
      aria-label="Assistant Mascot"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          triggerSuggestion(null, true);
        }
      }}
    >
      <div className="relative">
        {/* Speech Bubble */}
        <div className={bubbleClasses}>
          {message}
          <div style={arrowStyle}></div>
        </div>

        <img
          src={isTalking ? talkGif : blinkGif}
          alt={isTalking ? "Mascot talking" : "Mascot blinking"}
          draggable="false"
          className="w-20 h-20 object-contain drop-shadow-md pointer-events-none"
        />
      </div>
    </div>
  );
}

Mascot.propTypes = {
  userHasFloor: PropTypes.bool.isRequired,
  userIsTalking: PropTypes.bool.isRequired,
};

export default memo(Mascot);