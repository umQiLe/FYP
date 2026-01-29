import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  FileText,
  Shield,
  LifeBuoy,
  Mail,
} from "lucide-react";
import OptionButton from "./ui/OptionButton";

/**
 * InfoModal Component
 *
 * A multi-view modal component used to display informational content such as:
 * - Terms of Service
 * - Privacy Policy
 * - Support Contact Information
 *
 * Props:
 * - isOpen: Boolean controlling modal visibility.
 * - onClose: Function to close the modal.
 * - initialView: String determining the starting view ('menu', 'terms', 'privacy', 'support').
 */
export default function InfoModal({ isOpen, onClose, initialView = "menu" }) {
  const [view, setView] = useState(initialView);

  // Reset view to initial state whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  /**
   * Determines the header title based on the current view.
   */
  const getHeaderTitle = () => {
    switch (view) {
      case "terms":
        return "Terms of Service";
      case "privacy":
        return "Privacy Policy";
      case "support":
        return "Support";
      default:
        return "Legal & Support";
    }
  };

  /**
   * Renders the body content based on the current view state.
   */
  const renderContent = () => {
    switch (view) {
      case "menu":
        return (
          <div className="p-2 space-y-2">
            <OptionButton
              icon={<FileText className="h-4 w-4" />}
              label="Terms of Service"
              onClick={() => setView("terms")}
            />
            <OptionButton
              icon={<Shield className="h-4 w-4" />}
              label="Privacy Policy"
              onClick={() => setView("privacy")}
            />
            <OptionButton
              icon={<LifeBuoy className="h-4 w-4" />}
              label="Support"
              onClick={() => setView("support")}
            />
          </div>
        );

      case "terms":
        return (
          <div className="space-y-4 text-sm text-foreground overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <p className="text-muted-foreground">Last updated: January 2026</p>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                1. Introduction
              </h3>
              <p>
                Welcome to UM Push To Talk (UMPTT). By accessing or using our
                application, you agree to be bound by these Terms of Service. If
                you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                2. Use of Service
              </h3>
              <p>
                UMPTT provides a real-time communication platform for
                educational purposes. You agree to use this service responsibly
                and not to engage in any activity that disrupts or interferes
                with the service or other users' experience.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                3. User Conduct
              </h3>
              <p>
                Users are solely responsible for the content they transmit.
                Harassment, hate speech, and inappropriate behavior will not be
                tolerated and may result in account suspension.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                4. Disclaimer
              </h3>
              <p>
                The service is provided "as is" without warranties of any kind.
                We are not liable for any damages arising from the use of this
                service.
              </p>
            </section>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-4 text-sm text-foreground overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <p className="text-muted-foreground">Last updated: January 2026</p>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                1. Information We Collect
              </h3>
              <p>
                We collect information necessary to provide our services, such
                as your user profile (name, email) provided via authentication,
                and usage data (session participation). We do not record voice
                data permanently.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                2. How We Use Your Data
              </h3>
              <p>
                Your data is used to manage sessions, authenticate users, and
                improve service performance. We do not sell your personal data
                to third parties.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-1">
                3. Data Security
              </h3>
              <p>
                We implement reasonable security measures to protect your
                information. However, no method of transmission over the
                internet is 100% secure.
              </p>
            </section>
          </div>
        );

      case "support":
        return (
          <div className="flex flex-col items-center text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
              <LifeBuoy className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Need Help?
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                If you're experiencing issues or have any questions, our support
                team is here to help.
              </p>
            </div>

            <a
              href="mailto:22004866@siswa.um.edu.my"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-card rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Modal Container: Matches app visual style with shadow and border */}
      <div
        className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header: Navigation (Back) and Actions (Close) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {view !== "menu" && (
              <button
                onClick={() => setView("menu")}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                aria-label="Back to menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-foreground">
              {getHeaderTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Content Rendering */}
        <div className="p-4">{renderContent()}</div>
      </div>
    </div>
  );
}