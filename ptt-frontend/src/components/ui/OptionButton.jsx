import React from "react";

/**
 * A standardized, reusable button component designed for menus and list items.
 * 
 * @param {object} props
 * @param {React.ReactNode} props.icon - The icon element to render on the left side.
 * @param {string} props.label - The text label for the button.
 * @param {'default' | 'danger'} [props.variant='default'] - Visual style variant (default or danger).
 * @param {() => void} props.onClick - Handler for click events.
 */
export default function OptionButton({
  icon,
  label,
  variant = "default",
  onClick,
}) {
  // Map variant prop to specific Tailwind CSS classes for styling
  const variants = {
    default: "bg-accent hover:bg-button-hover text-accent-foreground",
    danger: "bg-destructive/10 hover:bg-destructive/20 text-destructive",
  };

  return (
    <button
      onClick={onClick}
      className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${variants[variant]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}