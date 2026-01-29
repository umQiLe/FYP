import { Mic, MicOff, Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import UserAvatar from "./UserAvatar";
import SpeakingIndicator from "./ui/SpeakingIndicator";

/**
 * CurrentSpeakerCard Component
 *
 * Displays the currently active speaker in a prominent card.
 * Features:
 * - Shows the speaker's avatar, name, and email.
 * - Visualizes real-time audio levels.
 * - Provides volume control for the lecturer to adjust output.
 * - Allows the lecturer to forcibly release the current speaker's turn.
 * - Shows a placeholder state when no one is speaking.
 */
export default function CurrentSpeakerCard({
  speaker,
  audioLevel,
  onForceRelease,
  volume = 1,
  setVolume = () => {},
}) {
  /**
   * Determines which volume icon to display based on the current volume level.
   * Returns: Icon component (VolumeX, Volume, Volume1, or Volume2).
   */
  const getVolumeIcon = () => {
    if (volume === 0)
      return <VolumeX className="w-4 h-4 text-muted-foreground" />;
    if (volume < 0.33)
      return <Volume className="w-4 h-4 text-muted-foreground" />;
    if (volume < 0.66)
      return <Volume1 className="w-4 h-4 text-muted-foreground" />;
    return <Volume2 className="w-4 h-4 text-muted-foreground" />;
  };

  /**
   * Toggles mute/unmute when the volume icon is clicked.
   * If currently muted (0), restores to full volume (1).
   * Otherwise, mutes audio (0).
   */
  const handleVolumeIconClick = () => {
    if (volume === 0) {
      setVolume(1);
    } else {
      setVolume(0);
    }
  };

  return (
    <div
      className={`flex flex-col justify-center items-center text-center p-6 rounded-2xl h-full min-h-[350px] ${
        speaker
          ? "bg-ptt-active/10 border-2 border-ptt-active"
          : "bg-card border border-border"
      }`}
    >
      <h3 className="text-lg font-medium text-muted-foreground mb-4">
        CURRENT SPEAKER
      </h3>
      
      {/* Conditional Render: Active Speaker vs. Idle State */}
      {speaker ? (
        <>
          {/* Avatar with Ripple Effect based on Audio Level */}
          <SpeakingIndicator isSpeaking={!!speaker} audioLevel={audioLevel}>
            <UserAvatar
              src={speaker.picture}
              name={speaker.name}
              email={speaker.email}
              className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md bg-green-500 text-white text-5xl"
            />
          </SpeakingIndicator>
          
          <h2 className="text-3xl font-bold mt-4 text-card-foreground">
            {speaker.name || speaker.email.split("@")[0]}
          </h2>
          <p className="text-muted-foreground">{speaker.email}</p>

          {/* Real-time Audio Level Visualizer Bar */}
          <div className="w-60 h-2 bg-muted rounded-full my-5 overflow-hidden">
            <div
              className="h-full bg-ptt-active transition-all duration-100"
              style={{ width: `${audioLevel}%` }}
            />
          </div>

          {/* Volume Control Slider & Mute Toggle */}
          <div className="flex items-center gap-3 mb-5 w-60">
            <button
              onClick={handleVolumeIconClick}
              className="hover:bg-muted p-1 rounded-full transition-colors"
              title={volume === 0 ? "Unmute" : "Mute"}
            >
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                // Dynamic gradient background for the slider track
                background: `linear-gradient(to right, var(--primary) ${
                  volume * 100
                }%, var(--muted) ${volume * 100}%)`,
              }}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary hover:[&::-webkit-slider-thumb]:bg-primary/80"
            />
            <span className="text-sm font-medium text-muted-foreground w-9 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Force Release Action for Lecturer */}
          <button
            onClick={onForceRelease}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <MicOff className="w-4 h-4" />
            <span>Force Release</span>
          </button>
        </>
      ) : (
        /* Empty State */
        <div className="text-center">
          <Mic className="w-16 h-16 text-neutral-500 mx-auto" />
          <p className="mt-4 text-muted-foreground font-medium">
            No one is speaking
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Students can tap the microphone button on their device to take the
            floor.
          </p>
        </div>
      )}
    </div>
  );
}