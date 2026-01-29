import React from "react";

// --- SVG Assets ---

// Cloud icon for Light Mode background
const CloudIcon = ({ className }) => (
  <svg viewBox="0 0 85 50" fill="currentColor" className={className}>
    <path d="M63.127,42.212H24.975c-7.023,0-12.736-5.713-12.736-12.736c0-7.023,5.713-12.736,12.736-12.736c1.204,0,2.379,0.165,3.514,0.491c2.879-5.927,8.93-9.785,15.635-9.785c9.362,0,17.019,7.438,17.371,16.716c0.536-0.098,1.083-0.147,1.633-0.147c5.017,0,9.099,4.082,9.099,9.099S68.145,42.212,63.127,42.212z" />
  </svg>
);

// Star icon for Dark Mode background
const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12,2l2.4,7.2h7.6l-6,4.8l2.4,7.2l-6-4.8l-6,4.8l2.4-7.2l-6-4.8h7.6L12,2z" />
  </svg>
);

// --- Theme Switch Component ---

/**
 * ThemeSwitch Component.
 *
 * A custom animated toggle switch for controlling the application's theme (Dark/Light).
 * It visualizes a Day/Night cycle transition with Sun/Moon animations and background elements
 * like clouds and stars.
 *
 * @param {boolean} isDark - Current theme state. True for Dark Mode, False for Light Mode.
 * @param {function} toggleTheme - Callback function to toggle the theme state.
 * @param {number} height - Optional height in pixels for the switch. Defaults to 56px.
 *                          The width is calculated automatically to maintain the aspect ratio.
 */
export default function ThemeSwitch({ isDark, toggleTheme, height = 56 }) {
  // Constants defining the base design dimensions (originally designed as w-32 h-14 in Tailwind)
  const BASE_WIDTH = 128;
  const BASE_HEIGHT = 56;

  // Calculate the scaling factor to resize the component based on the provided 'height' prop
  const scale = height / BASE_HEIGHT;
  const scaledWidth = BASE_WIDTH * scale;

  return (
    // Wrapper div sets the physical layout dimensions in the DOM
    <div
      style={{
        width: `${scaledWidth}px`,
        height: `${height}px`,
        position: "relative",
      }}
    >
      {/* 
        Scoped styles for custom animations.
        Includes a spring-like easing for the toggle knob and bounce animations for background elements.
      */}
      <style>{`
        .ease-spring {
          transition-timing-function: cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(-8%); }
          50% { transform: translateX(8%); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 3s ease-in-out infinite;
        }
        .animate-bounce-horizontal-slow {
          animation: bounce-horizontal 4s ease-in-out infinite;
        }
      `}</style>
      
      {/* 
        Main Button Element.
        Scaled using CSS 'transform' to preserve pixel-perfect internal layout regardless of size.
      */}
      <button
        onClick={toggleTheme}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          // Force base dimensions so scale works correctly
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
        }}
        className={`
          absolute top-0 left-0
          rounded-full p-1 cursor-pointer transition-colors duration-700 ease-in-out outline-none overflow-hidden
          ${
            isDark
              ? "bg-[#1e2b3a] shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]" // Night Sky
              : "bg-[#87CEEB] shadow-[inset_0_0_20px_rgba(255,255,255,0.5)]" // Day Sky
          }
        `}
        aria-label="Toggle Theme"
      >
        {/* --- Background Elements Layer --- */}
        <div className="absolute inset-0 rounded-full pointer-events-none">
          {/* Stars: Visible only in Dark Mode */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              isDark ? "opacity-100" : "opacity-0"
            }`}
          >
            <StarIcon className="absolute top-5 left-8 w-2 h-2 text-white opacity-80 animate-pulse" />
            <StarIcon className="absolute top-7 left-16 w-1.5 h-1.5 text-white opacity-60 animate-bounce" />
            <StarIcon className="absolute top-2 left-12 w-2.5 h-2.5 text-white opacity-90 animate-bounce-slow" />
            <StarIcon className="absolute top-10 left-10 w-1 h-1 text-white opacity-50 animate-pulse" />
            <StarIcon className="absolute top-4 left-4 w-1.5 h-1.5 text-white opacity-70 animate-pulse" />
          </div>

          {/* Clouds: Visible only in Light Mode */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              isDark ? "opacity-0" : "opacity-100"
            }`}
          >
            <div
              className={`absolute top-2 right-12 text-white opacity-80 transform transition-transform duration-700 animate-bounce-horizontal ${
                isDark ? "translate-y-4 opacity-0" : "translate-y-0"
              }`}
            >
              <CloudIcon className="w-6 h-6" />
            </div>

            <div
              className={`absolute top-6 right-4 text-white opacity-60 transform transition-transform duration-700 delay-100 animate-bounce-horizontal-slow ${
                isDark ? "translate-y-4 opacity-0" : "translate-y-0"
              }`}
            >
              <CloudIcon className="w-4 h-4" />
            </div>

            <div
              className={`absolute top-1 right-6 text-white opacity-70 transform transition-transform duration-700 delay-75 ${
                isDark ? "translate-y-4 opacity-0" : "translate-y-0"
              }`}
            >
              <CloudIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* --- Toggle Knob Layer (Sun / Moon) --- */}
        <div
          className={`
            relative w-12 h-12 rounded-full transform transition-transform duration-500 ease-spring z-10
          `}
          style={{ transform: isDark ? "translateX(72px)" : "translateX(0px)" }}
        >
          {/* 
            SVG Graphic that morphs between Sun (full circle) and Moon (crescent).
            Morphing is achieved by animating a mask circle over the base circle.
          */}
          <svg
            className="w-full h-full"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="moon-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <circle
                  cx={isDark ? "18" : "30"}
                  cy={isDark ? "6" : "-5"}
                  r="10"
                  fill="black"
                  style={{
                    transition: "cx 0.5s ease-in-out, cy 0.5s ease-in-out",
                  }}
                />
              </mask>
            </defs>
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#FDB813"
              mask="url(#moon-mask)"
              style={{
                transition: "filter 0.3s ease-in-out",
              }}
            />
          </svg>
        </div>
      </button>
    </div>
  );
}