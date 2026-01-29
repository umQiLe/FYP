import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useLecturerSession } from "../hooks/useLecturerSession";

export default function LecturerLayout({ user }) {
  // Manage session state and WebRTC connections via custom hook
  const sessionData = useLecturerSession(user);

  // Local state for global volume control and autoplay blocking detection
  const [volume, setVolume] = useState(1);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  // Attempt to resume audio playback if the browser blocked autoplay
  const handleResumeAudio = () => {
    const audios = document.querySelectorAll("audio");
    audios.forEach((a) => {
      a.play().catch((e) => console.error("Audio playback still blocked:", e));
    });
    setIsAudioBlocked(false);
  };

  return (
    <>
      {/* 
        Hidden container for audio elements.
        Iterates over remote streams and creates an <audio> tag for each participant.
      */}
      <div id="audio-container">
        {Object.entries(sessionData.remoteStreams).map(([uid, stream]) => (
          <audio
            key={uid}
            ref={(audio) => {
              if (audio) {
                // Assign the stream to the audio element if not already set
                if (audio.srcObject !== stream) {
                  audio.srcObject = stream;

                  // Attempt to play immediately. Catch errors to detect autoplay policy blocks.
                  audio.play().catch((e) => {
                    console.warn(
                      `[Audio] Auto-play blocked for user ${uid}:`,
                      e,
                    );
                    setIsAudioBlocked(true); // Trigger the UI banner
                  });
                }
                audio.volume = volume;
              }
            }}
            autoPlay
            playsInline
          />
        ))}
      </div>

      {/* 
        Banner displayed if audio autoplay was blocked.
        Provides a user interaction trigger (click) to resume audio contexts.
      */}
      {isAudioBlocked && (
        <div
          className="bg-destructive/90 text-destructive-foreground p-3 text-center cursor-pointer hover:bg-destructive transition-colors fixed top-16 left-0 right-0 z-50 animate-in slide-in-from-top-2"
          onClick={handleResumeAudio}
        >
          <span className="font-bold flex items-center justify-center gap-2">
            ⚠️ Audio Auto-play Blocked. Click here to Enable Audio.
          </span>
        </div>
      )}

      {/* Render child routes, passing session data and volume controls via context */}
      <Outlet context={{ ...sessionData, volume, setVolume }} />
    </>
  );
}
