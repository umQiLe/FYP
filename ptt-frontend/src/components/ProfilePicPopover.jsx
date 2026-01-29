import React, { useState } from "react";
import {
  User,
  Settings,
  LogOut,
  AlertTriangle,
  ChevronLeft,
  Trash2,
  X,
} from "lucide-react";
import { logout } from "../services/firebase";
import ThemeSwitch from "./ThemeSwitch";
import OptionButton from "./ui/OptionButton";

/**
 * ProfileMenuContent Component
 *
 * Displays the user profile menu with navigation between different views:
 * - Main: User info and primary actions (Settings, Logout)
 * - Settings: Appearance, sound preferences, and data management
 * - Confirmations: Logout and Clear Cache verification screens
 */
export default function ProfileMenuContent({
  user,
  isDark,
  toggleTheme,
  role,
  showMascot,
  toggleMascot,
}) {
  const [view, setView] = useState("main");
  
  // Initialize sound setting from local storage, default to true if not set
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem("lecturer_sound_enabled") !== "false"
  );

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("lecturer_sound_enabled", newValue);
  };

  // Container styling: full width to adapt to the parent popover/modal context
  const containerClass = "w-full p-2";

  // --- 1. Main Menu View ---
  // Displays user profile information and primary navigation options
  if (view === "main") {
    return (
      <div className={containerClass}>
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-4 space-y-3 border-b border-border">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
            {role && (
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                Role: {role}
              </p>
            )}
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-2 mt-2">
          <OptionButton
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            onClick={() => setView("settings")}
          />
          <OptionButton
            icon={<LogOut className="h-4 w-4" />}
            label="Log Out"
            variant="danger"
            onClick={() => setView("confirmLogout")}
          />
        </div>
      </div>
    );
  }

  // --- 2. Settings View ---
  // Allows configuration of theme, sound, mascot, and data management
  if (view === "settings") {
    return (
      <div className={containerClass}>
        {/* Navigation Header */}
        <div className="flex items-center gap-2 px-1 pb-3 mb-2 border-b border-border">
          <button
            onClick={() => setView("main")}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="px-1 pt-1 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="pr-2">
              <h3 className="text-sm font-semibold text-foreground">
                Appearance
              </h3>
              <p className="text-xs text-muted-foreground">
                {isDark ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <ThemeSwitch
              isDark={isDark}
              toggleTheme={toggleTheme}
              height={24}
            />
          </div>

          {/* Sound Toggle (Visible only to Lecturers) */}
          {role === "lecturer" && (
            <div className="flex items-center justify-between">
              <div className="pr-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Notifications
                </h3>
                <p className="text-xs text-muted-foreground">
                  {soundEnabled ? "Sound enabled" : "Sound disabled"}
                </p>
              </div>
              <button
                onClick={toggleSound}
                className={`w-[55px] h-6 rounded-full relative focus:outline-none ${
                  soundEnabled ? "bg-primary/70" : "bg-primary/25"
                }`}
                aria-label="Toggle Sound"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm ${
                    soundEnabled ? "left-[35px]" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Mascot Toggle (Visible only to Students) */}
          {role === "student" && (
            <div className="flex items-center justify-between">
              <div className="pr-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Assistant
                </h3>
                <p className="text-xs text-muted-foreground">Show mascot</p>
              </div>
              <button
                onClick={toggleMascot}
                className={`w-[55px] h-6 rounded-full relative focus:outline-none ${
                  showMascot ? "bg-primary/70" : "bg-primary/25"
                }`}
                aria-label="Toggle Mascot"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm ${
                    showMascot ? "left-[35px]" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Clear Cache Option */}
          <div className="flex items-center justify-between">
            <div className="pr-2 flex-1">
              <h3 className="text-sm font-semibold text-foreground">Data</h3>
              <p className="text-xs text-muted-foreground">Clear cache</p>
            </div>
            <button
              onClick={() => setView("confirmClearCache")}
              // Compact button styling for better fit
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors text-xs font-medium border border-destructive/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. Logout Confirmation View ---
  if (view === "confirmLogout") {
    return (
      <div className={containerClass}>
        {/* Navigation Header */}
        <div className="flex items-center gap-2 px-1 pb-3 mb-2 border-b border-border">
          <button
            onClick={() => setView("main")}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Log Out</h2>
        </div>
        
        {/* Confirmation Content */}
        <div className="text-center py-2">
          <AlertTriangle className="w-8 h-8 text-alert mx-auto mb-2" />
          <h3 className="text-base font-semibold text-foreground">
            Are you sure?
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            You will be returned to the login screen.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setView("main")}
              className="flex-1 h-9 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-button-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={logout}
              className="flex-1 h-9 rounded-md bg-warning text-text text-xs font-medium hover:bg-destructive/90 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. Clear Cache Confirmation View ---
  if (view === "confirmClearCache") {
    return (
      <div className={containerClass}>
        {/* Navigation Header */}
        <div className="flex items-center gap-2 px-1 pb-2 mb-2 border-b border-border">
          <button
            onClick={() => setView("settings")}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Clear Cache</h2>
        </div>
        
        {/* Confirmation Content */}
        <div className="text-center py-2">
          <AlertTriangle className="w-8 h-8 text-alert mx-auto mb-2" />
          <h3 className="text-base font-semibold text-foreground">
            Are you sure?
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            This will clear all site data from your browser and reload the page.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setView("settings")}
              className="flex-1 h-9 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-button-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1 h-9 rounded-md bg-warning text-text text-xs font-medium hover:bg-destructive/90 transition-colors"
            >
              Confirm & Clear
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}