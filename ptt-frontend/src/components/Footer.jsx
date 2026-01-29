import React, { useState } from "react";
import UMPTTLogo from "@/assets/UMPTT Logo Gradient Animated";
import InfoModal from "./InfoModal";

/**
 * Footer Component
 *
 * Displays the application footer containing:
 * - Branding (Logo and Copyright).
 * - Information links (Terms, Privacy, Support) that open a modal.
 */
export default function Footer() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState("menu"); // Controls which content the modal displays

  /**
   * Opens the InfoModal with the specified content view.
   * @param {string} view - The section to display ('terms', 'privacy', 'support').
   */
  const openModal = (view) => {
    setModalView(view);
    setModalOpen(true);
  };

  return (
    <>
      <footer className="bg-card text-card-foreground text-center py-4 px-5">
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-y-4">
          {/* Left Side: Logo and Copyright Notice */}
          <div className="flex items-center text-xs">
            <UMPTTLogo className="h-10 w-auto" />
            <p className="ml-4">
              &copy; {new Date().getFullYear()} UM Push To Talk. All Rights
              Reserved.
            </p>
          </div>

          {/* Right Side: Informational Links */}
          <div className="flex items-center gap-x-6 text-xs">
            <button
              onClick={() => openModal("terms")}
              className="hover:text-primary bg-transparent border-none cursor-pointer p-0"
            >
              Terms
            </button>
            <button
              onClick={() => openModal("privacy")}
              className="hover:text-primary bg-transparent border-none cursor-pointer p-0"
            >
              Privacy
            </button>
            <button
              onClick={() => openModal("support")}
              className="hover:text-primary bg-transparent border-none cursor-pointer p-0"
            >
              Support
            </button>
          </div>
        </div>
      </footer>

      {/* Info Modal for displaying content from links */}
      <InfoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialView={modalView}
      />
    </>
  );
}