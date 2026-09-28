"use client";

import type React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./shiny-button.module.css";

interface ShinyButtonProps {
  label?: string;
  asChild?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fillColor?: string;
  labelColor?: string;
  accentColor?: string;
  accentSoftColor?: string;
  sweepDuration?: number;
  easeDuration?: number;
  arcWidth?: number;
  cornerRadius?: number;
  showSpeckle?: boolean;
  showSheen?: boolean;
  speckleOpacity?: number;
}

export function ShinyButton({
  label = "Get Started",
  asChild = false,
  children,
  onClick,
  className = "",
  fillColor = "#000000",
  labelColor = "#ffffff",
  accentColor = "#ff5f00",
  accentSoftColor = "#ff9253",
  sweepDuration = 3,
  easeDuration = 0.8,
  arcWidth = 5,
  cornerRadius = 32,
  showSpeckle = true,
  showSheen = true,
  speckleOpacity = 0.4,
}: ShinyButtonProps) {
  const Component = asChild ? Slot : "button";
  const style = {
    "--button-fill": fillColor,
    "--button-label": labelColor,
    "--button-accent": accentColor,
    "--button-accent-soft": accentSoftColor,
    "--button-sweep-duration": sweepDuration + "s",
    "--button-ease-duration": easeDuration + "s",
    "--button-arc-width": arcWidth + "%",
    "--button-radius": cornerRadius + "px",
    "--button-speckle-opacity": showSpeckle ? speckleOpacity : 0,
    "--button-sheen-opacity": showSheen ? 0.6 : 0,
  } as React.CSSProperties;

  return (
    <Component
      type={asChild ? undefined : "button"}
      className={styles.button + " " + className}
      style={style}
      onClick={onClick}
      aria-label={label}
    >
      {asChild ? children : <span>{label}</span>}
    </Component>
  );
}

export default ShinyButton;