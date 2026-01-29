import { useState } from "react";
import UMPTTLogo from "@/assets/UMPTT Logo Gradient Animated";
import { NavLink } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ProfileMenuContent from "./ProfilePicPopover";
import UserAvatar from "./UserAvatar";

/**
 * Header Component
 *
 * The main application header, responsible for:
 * - Displaying the application logo.
 * - Providing navigation links (for Lecturers).
 * - Housing the user profile menu with theme and mascot controls.
 *
 * Props:
 * - user: Current authenticated user object.
 * - isDark: Boolean indicating if dark mode is active.
 * - toggleTheme: Function to switch between light and dark themes.
 * - role: User role ('lecturer' or 'student') to conditionally render navigation.
 * - showMascot: Boolean indicating if the mascot is visible.
 * - toggleMascot: Function to toggle mascot visibility.
 */
export default function Header({
  user,
  isDark,
  toggleTheme,
  role,
  showMascot,
  toggleMascot,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper for conditional NavLink styling
  const navLinkClassName = ({ isActive }) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <>
      {/* Background Overlay: Dims the rest of the screen when the profile popover is open */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <header className="bg-card text-card-foreground py-3 px-5">
        <div className="mx-auto flex flex-row items-center justify-between gap-y-4">
          {/* Brand Logo */}
          <div className="flex items-center">
            <UMPTTLogo className="h-12 w-auto" />
          </div>

          {/* Navigation Tabs (Lecturer Only) */}
          {role === "lecturer" && (
            <div className="flex flex-col sm:flex-row items-center gap-y-3 gap-x-18 text-lg">
              <NavLink to="/" className={navLinkClassName}>
                Dashboard
              </NavLink>
              <NavLink to="/statistics" className={navLinkClassName}>
                Statistics
              </NavLink>
            </div>
          )}

          {/* User Profile Section */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <div className="relative z-50 flex items-center gap-x-6 text-md cursor-pointer">
                <UserAvatar
                  src={user?.photoURL}
                  name={user?.displayName}
                  email={user?.email}
                  className="h-10 w-10 rounded-full"
                  fallback={
                    !user?.photoURL ? (
                      <div className="hover:text-primary">Profile</div>
                    ) : null
                  }
                />
              </div>
            </PopoverTrigger>

            {/* Profile Dropdown Menu */}
            <PopoverContent
              className="w-72"
              side="bottom"
              align="end"
              sideOffset={10}
            >
              <ProfileMenuContent
                user={user}
                isDark={isDark}
                toggleTheme={toggleTheme}
                role={role}
                showMascot={showMascot}
                toggleMascot={toggleMascot}
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>
    </>
  );
}
