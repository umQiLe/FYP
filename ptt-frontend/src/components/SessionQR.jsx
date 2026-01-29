import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SessionQR({ lanIP }) {
  const [isQrFullscreen, setIsQrFullscreen] = useState(false);
  const [ssid, setSsid] = useState("");

  const toggleQrFullscreen = () => {
    setIsQrFullscreen(!isQrFullscreen);
  };

  // Fetch system information (e.g., connected Wi-Fi SSID) on mount
  useEffect(() => {
    fetch("/api/system/info")
      .then((res) => res.json())
      .then((data) => {
        if (data.ssid) setSsid(data.ssid);
      })
      .catch((err) => console.error("Failed to fetch system info:", err));
  }, []);

  // Determine the host address to display in the QR code.
  // Prioritize the provided LAN IP (if available) so devices on the same network can connect.
  const targetHost = lanIP || window.location.hostname;
  const joinUrl = `https://${targetHost}:${window.location.port}`;

  // Generate QR code pointing to the join URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
    joinUrl
  )}`;

  return (
    <>
      {/* Sidebar / Card View */}
      <div className="flex flex-col items-center justify-center p-4 bg-card text-card-foreground rounded-2xl shadow-sm border border-border h-full">
        <div
          className="cursor-zoom-in mb-4"
          onClick={toggleQrFullscreen}
          title="Click to enlarge"
        >
          <img
            src={qrCodeUrl}
            alt="Join Session QR Code"
            className="rounded-lg w-40 h-40 object-contain"
          />
        </div>
        <div className="text-center w-full">
          <h3 className="font-semibold text-card-foreground mb-2">
            Join Session
          </h3>
          
          {/* SSID Display */}
          <div className="mb-2">
            <span className="text-xs font-bold text-muted-foreground">
              Wi-Fi:
            </span>
            <span className="ml-1 text-sm font-medium text-foreground">
              {ssid || "Loading..."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(joinUrl);
              toast.success("Link copied to clipboard");
            }}
            title="Click to copy"
            className="text-xs text-primary hover:underline break-all block w-full bg-transparent border-none cursor-pointer"
          >
            {joinUrl}
          </button>
        </div>
      </div>

      {/* Fullscreen Overlay for easier scanning */}
      {isQrFullscreen && (
        <div
          className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={toggleQrFullscreen}
        >
          <img
            src={qrCodeUrl.replace("size=256x256", "size=1000x1000")}
            alt="Enlarged Join Session QR Code"
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl bg-white p-2 shadow-2xl"
          />
          <p className="mt-6 text-white/70 text-sm font-medium tracking-wide animate-pulse">
            Click anywhere to close
          </p>
        </div>
      )}
    </>
  );
}