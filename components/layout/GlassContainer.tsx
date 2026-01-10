"use client";

import { cn } from "@/lib/utils";

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "solid" | "frosted" | "clear" | "dense" | "prismatic";
  hover?: boolean;
  glow?: boolean;
}

export function GlassContainer({
  children,
  className,
  variant = "default",
  hover = false,
  glow = false,
}: GlassContainerProps) {
  const baseStyles = "relative rounded-2xl transition-all duration-300";

  const variantStyles = {
    default: "liquid-glass",
    solid: "glass-solid",
    frosted: "glass-frosted",
    clear: "glass-clear",
    dense: "glass-dense",
    prismatic: "prismatic-border",
  };

  const hoverStyles = hover
    ? "hover:translate-y-[-4px] hover:shadow-lifted hover:border-[var(--glass-border-medium)] cursor-pointer"
    : "";

  const glowStyles = glow
    ? "shadow-glow-sm hover:shadow-glow-md"
    : "";

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        glowStyles,
        className
      )}
    >
      {children}
    </div>
  );
}

// Convenience components for common use cases
export function LiquidCard({
  children,
  className,
  ...props
}: Omit<GlassContainerProps, "variant" | "hover">) {
  return (
    <GlassContainer
      variant="default"
      hover
      className={cn("p-6", className)}
      {...props}
    >
      {children}
    </GlassContainer>
  );
}

export function GlassPanel({
  children,
  className,
  ...props
}: Omit<GlassContainerProps, "variant">) {
  return (
    <GlassContainer
      variant="solid"
      className={cn("p-4", className)}
      {...props}
    >
      {children}
    </GlassContainer>
  );
}
