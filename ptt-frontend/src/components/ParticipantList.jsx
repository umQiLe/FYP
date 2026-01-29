import { useState } from "react";
import { Search, Users, AlertTriangle } from "lucide-react";
import UserAvatar from "./UserAvatar";
import EmptyState from "./EmptyState";

/**
 * ParticipantList Component
 * 
 * Displays a list of users with search and action capabilities.
 * It supports two modes based on `actionType`:
 * 1. "kick" (default): Standard participant list where users can be kicked from the session.
 * 2. "remove": Request queue list where users can be removed from the queue.
 */
export default function ParticipantList({
  participants,
  speaker,
  onKick,
  kickingUid,
  searchQuery,
  onSearchChange,
  actionType = "kick", // "kick" or "remove"
  onAction, // Handler for "remove" action
}) {
  const [target, setTarget] = useState(null);

  // Filter and sort participants
  const filtered = participants
    .filter(
      (p) =>
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // In "remove" mode (Request Queue), preserve the original FIFO order (do not sort).
      if (actionType === "remove") return 0;

      // In "kick" mode (Participant List), prioritize the active speaker, then sort alphabetically.
      if (speaker?.uid === a.uid) return -1;
      if (speaker?.uid === b.uid) return 1;
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

  const handleConfirmAction = () => {
    if (target) {
      if (actionType === "remove" && onAction) {
        onAction(target.uid);
      } else {
        onKick(target.uid);
      }
      setTarget(null);
    }
  };

  const isKickMode = actionType === "kick";
  const actionLabel = isKickMode ? "Kick" : "Remove";
  const processingLabel = isKickMode ? "Kicking..." : "Removing...";
  
  // Dynamic styles based on action type
  const buttonClass = isKickMode 
    ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
    : "bg-orange-500/20 text-orange-600 hover:bg-orange-500/30";
    
  const confirmTitle = isKickMode 
    ? `Kick ${target?.name || "User"}?` 
    : `Remove ${target?.name || "User"}?`;
    
  const confirmMessage = isKickMode
    ? "This will remove the student from the current session."
    : "This will remove the student from the request queue.";

  const confirmBtnClass = isKickMode
    ? "bg-warning text-text hover:bg-destructive/90"
    : "bg-orange-500 text-white hover:bg-orange-600";

  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full p-2 pl-10 border border-input bg-transparent rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filtered.length > 0 ? (
          filtered.map((p, index) => {
            const isSpeaking = speaker?.uid === p.uid;
            // Use kickingUid to track processing state for both kick and remove actions
            const isProcessing = kickingUid === p.uid; 
            
            return (
              <div
                key={p.uid}
                className={`flex items-center p-3 rounded-lg mb-2 ${isProcessing
                    ? "bg-destructive/20 opacity-50"
                    : isSpeaking
                      ? "bg-ptt-active/10"
                      : "bg-card hover:bg-accent"
                  }`}
              >
                 {/* Show Queue Position Index only in Request Queue mode */}
                 {!isKickMode && (
                  <div className="mr-3 text-sm font-mono text-muted-foreground w-6 text-center">
                    {index + 1}
                  </div>
                )}
                
                <div className="relative">
                  <UserAvatar
                    src={p.picture}
                    name={p.name}
                    email={p.email}
                    className={`w-10 h-10 rounded-full mr-3 transition-all duration-300 ${isSpeaking ? "ring-2 ring-ptt-active ring-offset-2 ring-offset-card" : ""
                      }`}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold truncate text-card-foreground">
                    {p.name || "Unknown"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {p.email}
                  </div>
                </div>
                <button
                  onClick={() => setTarget(p)}
                  disabled={isProcessing}
                  className={`ml-2 px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
                >
                  {isProcessing ? processingLabel : actionLabel}
                </button>
              </div>
            );
          })
        ) : (
          <EmptyState
            icon={Users}
            title={isKickMode ? "Waiting for students..." : "No requests pending"}
            message={isKickMode ? "Students who join will appear here." : "Students requesting to speak will appear here."}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      {target && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center py-2">
              <AlertTriangle className="w-8 h-8 text-alert mx-auto mb-2" />
              <h3 className="text-base font-semibold text-foreground">
                {confirmTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {confirmMessage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTarget(null)}
                  className="flex-1 h-9 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-button-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`flex-1 h-9 rounded-md text-xs font-medium transition-colors ${confirmBtnClass}`}
                >
                  {actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
