import { clsx } from "clsx"; // Allows toggle class names based on boolean conditions (e.g., clsx("btn", isPrimary && "btn-primary"))
import { twMerge } from "tailwind-merge"; // merges conflicting Tailwind CSS classes (e.g., ensuring p-4 overrides p-2 if both are passed, rather than just concatenating them)

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
