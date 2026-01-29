import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card Component.
 *
 * A flexible container for grouping related content and actions.
 * Provides a styled box with a background, border, and shadow.
 */
function Card({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props} />
  );
}

/**
 * CardHeader Component.
 *
 * The header section of a Card.
 * Typically contains the CardTitle and CardDescription.
 * Supports an optional action slot (CardAction) for buttons or controls.
 */
function CardHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props} />
  );
}

/**
 * CardTitle Component.
 *
 * The main heading of the Card.
 */
function CardTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props} />
  );
}

/**
 * CardDescription Component.
 *
 * Subtext or supporting information for the CardTitle.
 */
function CardDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props} />
  );
}

/**
 * CardAction Component.
 *
 * A container for actions (like buttons or menus) located in the CardHeader.
 * Automatically positioned to the top-right of the header grid.
 */
function CardAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props} />
  );
}

/**
 * CardContent Component.
 *
 * The main body content of the Card.
 */
function CardContent({
  className,
  ...props
}) {
  return (<div data-slot="card-content" className={cn("px-6", className)} {...props} />);
}

/**
 * CardFooter Component.
 *
 * The footer section of a Card.
 * Useful for secondary actions or summary information.
 */
function CardFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}