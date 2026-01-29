import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { UserX, Clock, AlertTriangle } from "lucide-react";
import CurrentSpeakerCard from "./CurrentSpeakerCard";
import ParticipantList from "./ParticipantList";
import SessionQR from "./SessionQR";
import EmptyState from "./EmptyState";

/**
 * LecturerView (Dashboard)
 *
 * This component serves as the main control panel for the lecturer.
 * It provides functionality to:
 * - Monitor the current speaker and audio levels.
 * - Manage participants (view active, handle requests, ban/unban users).
 * - Display session information (QR code, connection status, timer).
 * - Control global volume and session settings.
 */
export default function Dashboard() {
  // Access shared session state and control functions from the LecturerLayout
  const {
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
    handleKick,
    handleRemoveRequest,
    handleUnban,
    handleForceRelease,
    volume,
    setVolume,
    sessionStartTime,
  } = useOutletContext();

  // Local state for UI management
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // Options: 'active', 'requests', 'banned'

  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [unbanTarget, setUnbanTarget] = useState(null);

  /**
   * Effect to update the session timer.
   * Calculates the elapsed time since session start and formats it as HH:MM:SS.
   */
  useEffect(() => {
    if (!sessionStartTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000); // Calculate seconds elapsed
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      // Format time components to be 2 digits (e.g., "01")
      const formattedTime = [hours, minutes, seconds]
        .map((v) => v.toString().padStart(2, "0"))
        .join(":");
      setElapsedTime(formattedTime);
    };

    updateTimer(); // Initial call to set immediate time
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId); // Cleanup interval on unmount or sessionStartTime change
  }, [sessionStartTime]);

  const handleConfirmUnban = () => {
    if (unbanTarget) {
      handleUnban(unbanTarget.uid);
      setUnbanTarget(null);
    }
  };

  return (
    <div className="p-4 w-full flex flex-col h-full lg:h-[calc(100vh-9rem)] overflow-y-auto lg:overflow-hidden custom-scrollbar">
      {/* Top Header: Displays title, connection status, and session timer */}
      <header className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">
            Lecturer Control Panel
          </h1>
          {/* Connection Status Indicator */}
          <span
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${
              isConnected
                ? "bg-green-500/20 text-green-500"
                : "bg-destructive/20 text-destructive animate-pulse"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {connectionStatus}
          </span>
          {/* Session Timer (visible only when connected) */}
          {isConnected && (
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              <Clock className="w-4 h-4" />
              <span>{elapsedTime}</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Content Grid: Split into Speaker/Controls (left), QR (center), and Participant Lists (right) */}
      <main className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* Left Column: Current Speaker Display & Audio Controls */}
        <div className="lg:col-span-2">
          <CurrentSpeakerCard
            speaker={speaker}
            audioLevel={((audioLevels[speaker?.uid] || 0) / 255) * 100}
            onForceRelease={handleForceRelease}
            volume={volume}
            setVolume={setVolume}
          />
        </div>

        {/* Middle Column: Session QR Code for joining */}
        <div className="lg:col-span-1">
          <SessionQR lanIP={lanIP} />
        </div>

        {/* Right Column: Tabbed interface for Active Participants, Speak Requests, and Banned Users */}
        <div className="flex flex-col lg:col-span-2 bg-card text-card-foreground p-4 rounded-2xl shadow-sm border border-border lg:h-full lg:overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "requests"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Requests ({requestQueue ? requestQueue.length : 0})
            </button>
            <button
              onClick={() => setActiveTab("banned")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "banned"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Banned ({bannedList.length})
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 flex flex-col pt-4 min-h-[300px] lg:min-h-0">
            {activeTab === "active" ? (
              <ParticipantList
                participants={participants}
                speaker={speaker}
                onKick={handleKick}
                kickingUid={kickingUid}
                searchQuery={searchQuery}
                onSearchChange={(e) => setSearchQuery(e.target.value)}
                actionType="kick"
              />
            ) : activeTab === "requests" ? (
              <ParticipantList
                participants={requestQueue || []}
                speaker={speaker}
                onKick={handleKick} // Kept for API consistency, though not primary action here
                onAction={handleRemoveRequest}
                kickingUid={null}
                searchQuery={searchQuery}
                onSearchChange={(e) => setSearchQuery(e.target.value)}
                actionType="remove"
              />
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {/* Banned Users List */}
                {bannedList.length > 0 ? (
                  bannedList.map((p) => (
                    <div
                      key={p.uid}
                      className="flex items-center p-3 bg-muted/50 rounded-lg mb-2"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-muted-foreground line-through truncate">
                          {p.name || "Banned User"}
                        </div>
                        <div className="text-sm text-muted-foreground/80 truncate">
                          {p.email}
                        </div>
                      </div>
                      <button
                        onClick={() => setUnbanTarget(p)}
                        className="ml-2 px-3 py-1 bg-green-500/20 text-green-500 rounded-md text-sm hover:bg-green-500/30 transition-colors"
                      >
                        Unban
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={UserX}
                    title="No Banned Users"
                    message="Kicked students will be listed here."
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Unban Confirmation Modal Overlay */}
      {unbanTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center py-2">
              <AlertTriangle className="w-8 h-8 text-alert mx-auto mb-2" />
              <h3 className="text-base font-semibold text-foreground">
                Unban {unbanTarget.name || "User"}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                The student will be able to rejoin the session.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnbanTarget(null)}
                  className="flex-1 h-9 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-button-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUnban}
                  className="flex-1 h-9 rounded-md bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
                >
                  Unban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}