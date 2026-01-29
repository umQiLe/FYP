import React from "react";
import { motion } from "framer-motion";
import { signInWithGoogle } from "../services/firebase";
import { Toaster, toast } from "sonner";


import UMPTTLogoWhite from "@/assets/UMPTT Logo White - transparent.svg";
import UMPTTLogoAnimated from "@/assets/UMPTT Logo Gradient Animated.jsx";

/**
 * UMPTTLogin Component
 *
 * This component provides the authentication interface for the application.
 * Features:
 * - Google Sign-In integration specifically targeting University of Malaya domains.
 * - Responsive design:
 *   - Left side (Desktop): Animated branding with moving gradients and logo.
 *   - Right side: Login controls and instructions.
 * - Uses Framer Motion for background animations.
 */
const UMPTTLogin = () => {
  /**
   * Handles the Google Sign-In process.
   * Triggers the Firebase authentication flow and manages error notifications.
   */
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("Sign-in cancelled");
      } else {
        toast.error("Login failed: " + error.message);
      }
    }
  };

  /**
   * Animation variants for the background blobs.
   * Creates a breathing and circular motion effect for visual appeal.
   *
   * @param {number} radius - The radius of the circular motion path.
   * @param {number} duration - Duration for one complete orbit.
   * @param {number} delay - Start delay for the animation.
   * @param {number} breathingDuration - Duration for the scale pulse effect.
   */
  const circleVariants = (radius, duration, delay, breathingDuration) => ({
    animate: {
      // Circular motion using x and y coordinates
      x: [0, radius, 0, -radius, 0],
      y: [-radius, 0, radius, 0, -radius],
      // Breathing effect (scaling up and down)
      scale: [1, 1.15, 1],
      transition: {
        x: {
          duration: duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay,
        },
        y: {
          duration: duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay,
        },
        scale: {
          duration: breathingDuration,
          repeat: Infinity,
          ease: "easeInOut",
        },
      },
    },
  });

  return (
    <div className="flex h-full w-full bg-slate-50 font-sans antialiased">
      <Toaster richColors />

      {/* LEFT SIDE: Branding and Animations (Visible on Large Screens) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-[#0e0e0e] lg:block">
        {/* Animated Background Blobs */}
        {/* Circle 1: Violet - Top Left Center */}
        <motion.div
          variants={circleVariants(60, 12, 0, 4)}
          animate="animate"
          className="absolute left-[10%] top-[5%] h-[50%] w-[50%] rounded-full bg-[#8B5CF6] opacity-30 blur-[100px]"
        />

        {/* Circle 2: Blue - Middle Right Center */}
        <motion.div
          variants={circleVariants(80, 15, 2, 6)}
          animate="animate"
          className="absolute right-[0%] top-[25%] h-[60%] w-[60%] rounded-full bg-[#60A5FA] opacity-30 blur-[120px]"
        />

        {/* Circle 3: Cyan - Bottom Left Center */}
        <motion.div
          variants={circleVariants(70, 10, 4, 5)}
          animate="animate"
          className="absolute bottom-[5%] left-[10%] h-[45%] w-[45%] rounded-full bg-[#06B6D4] opacity-30 blur-[90px]"
        />

        {/* Branding Content Overlay */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-16 text-white">
          <motion.img
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            src={UMPTTLogoWhite}
            className="w-48 mb-10 drop-shadow-2xl"
            alt="UMPTT Logo"
          />
          <h1 className="text-4xl font-bold tracking-tight text-center">
            Speak. Listen. Learn.
          </h1>
          <p className="mt-4 text-center text-lg font-light text-slate-300 max-w-md">
            The official Push-to-Talk platform for Universiti Malaya lecture
            halls.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form and Actions */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile Logo (Visible only on smaller screens) */}
          <div className="flex justify-center lg:hidden">
            <UMPTTLogoAnimated className="h-30 w-auto" />
          </div>

          <h2 className="text-3xl font-bold text-slate-900">Sign In</h2>

          {/* User Instructions: Domain Restriction Notice */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-blue-900">
              Please sign in with your{" "}
              <span className="font-bold text-blue-700 underline underline-offset-2">
                @siswa.um.edu.my
              </span>{" "}
              or{" "}
              <span className="font-bold text-blue-700 underline underline-offset-2">
                @um.edu.my
              </span>{" "}
              account to continue.
            </p>
          </div>

          <div className="mt-8">
            {/* Google Sign-In Button */}
            <button
              onClick={handleLogin}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-4 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
            >

              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-6 h-6 transition-transform group-hover:scale-110"
              />
              <span>Sign in with Google</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UMPTTLogin;