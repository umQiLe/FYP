import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * UserAvatar component.
 * 
 * Displays a user's avatar image. If the image fails to load or is not provided,
 * it falls back to displaying the user's initials or a custom fallback element.
 *
 * @param {string} src - The URL of the avatar image.
 * @param {string} name - The user's name, used to generate initials.
 * @param {string} email - The user's email, used as a secondary source for initials.
 * @param {string} className - specific CSS classes to apply to the avatar.
 * @param {React.ReactNode} fallback - An optional custom fallback element to render if the image is missing/broken.
 * @param {string} alt - Alt text for the image. Defaults to "User avatar".
 */
export default function UserAvatar({
  src,
  name,
  email,
  className,
  fallback,
  alt = "User avatar",
}) {
  const [imageError, setImageError] = useState(false);

  // When the source URL changes, reset the error state to attempt loading the new image.
  useEffect(() => {
    setImageError(false);
  }, [src]);

  // If no image source is provided or if the image failed to load, render the fallback.
  if (!src || imageError) {
    if (fallback) {
      return fallback;
    }

    // Generate initials: use the first letter of the name, or email if name is missing, otherwise '?'.
    const displayChar = name
      ? name[0].toUpperCase()
      : email
        ? email[0].toUpperCase()
        : "?";

    return (
      <div
        className={cn(
          "flex items-center justify-center font-bold bg-muted text-muted-foreground",
          className,
        )}
      >
        {displayChar}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}