import React from "react";

/**
 * A visual indicator that pulses around its children to show audio activity.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The content to wrap (e.g., an avatar).
 * @param {boolean} props.isSpeaking - Determines if the ring is visible and active.
 * @param {number} props.audioLevel - A value from 0 to 100 to control the ring's size.
 */
export default function SpeakingIndicator({
  children,
  isSpeaking,
  audioLevel = 0,
}) {
  // Calculate scale based on audio volume (0-100), ranging from 1.0 to 1.25
  const scale = 1 + (audioLevel / 100) * 0.25;

  return (
    <div className="relative flex items-center justify-center">
      {/* Animated ring that scales with audio level */}
      <div
        className="absolute inset-0 rounded-full border-2 border-ptt-active transition-all duration-100 ease-out"
        style={{
          transform: `scale(${isSpeaking ? scale : 1})`,
          opacity: isSpeaking ? 0.4 : 0, // Only visible when speaking
        }}
      />
      {/* The actual content (e.g., UserAvatar) sits on top */}
      <div className="relative">{children}</div>
    </div>
  );
}