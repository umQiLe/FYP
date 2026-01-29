/**
 * EmptyState Component.
 *
 * Displays a placeholder UI when there is no content to show (e.g., empty lists, no data).
 * Centered vertically and horizontally within its container.
 *
 * @param {React.ComponentType} icon - The icon component to display (e.g., a Lucide icon).
 * @param {string} title - The main heading text for the empty state.
 * @param {string} message - A secondary description or instruction for the user.
 */
export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="text-center text-muted-foreground pt-10 flex flex-col items-center h-full justify-center">
      <Icon className="w-16 h-16 text-neutral-500" />
      <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground/80">{message}</p>
    </div>
  );
}