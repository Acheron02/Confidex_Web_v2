"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, animate } from "framer-motion";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [constraints, setConstraints] = React.useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });
  const buttonSize = 64;
  const padding = 20;

  const dragX = useMotionValue(padding);
  const dragY = useMotionValue(padding);
  const scale = useMotionValue(1);
  const [position, setPosition] = React.useState({ x: padding, y: padding });
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);

    const updateConstraints = () => {
      setConstraints({
        left: padding,
        top: padding + 20,
        right: window.innerWidth - buttonSize - padding,
        bottom: window.innerHeight - buttonSize - padding - 20,
      });

      // Clamp current position
      dragX.set(
        Math.min(
          window.innerWidth - buttonSize - padding,
          Math.max(padding, position.x)
        )
      );
      dragY.set(
        Math.min(
          window.innerHeight - buttonSize - padding - 20,
          Math.max(padding + 20, position.y)
        )
      );
    };

    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    return () => window.removeEventListener("resize", updateConstraints);
  }, [dragX, dragY, position.x, position.y]);

  const handleDragEnd = () => {
    setIsDragging(false);

    // Define the 4 corners
    const corners = [
      { x: constraints.left, y: constraints.top },
      { x: constraints.right, y: constraints.top },
      { x: constraints.left, y: constraints.bottom },
      { x: constraints.right, y: constraints.bottom },
    ];

    // Find nearest corner
    let nearest = corners[0];
    let minDist = Infinity;
    for (const c of corners) {
      const dist = Math.hypot(position.x - c.x, position.y - c.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = c;
      }
    }

    // Animate motion values to the nearest corner with spring + bounce
    animate(dragX, nearest.x, { type: "spring", stiffness: 500, damping: 40 });
    animate(dragY, nearest.y, { type: "spring", stiffness: 500, damping: 40 });
    animate(scale, [1.2, 1], { type: "spring", stiffness: 500, damping: 20 });

    setPosition(nearest);
  };

  if (!mounted) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={constraints}
      onDragStart={() => setIsDragging(true)}
      onDrag={(e, info) => {
        let newX = position.x + info.delta.x;
        let newY = position.y + info.delta.y;

        // Hard clamp
        newX = Math.min(constraints.right, Math.max(constraints.left, newX));
        newY = Math.min(constraints.bottom, Math.max(constraints.top, newY));

        dragX.set(newX);
        dragY.set(newY);
        setPosition({ x: newX, y: newY });
      }}
      onDragEnd={handleDragEnd}
      initial={{ x: constraints.left, y: constraints.top }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: buttonSize,
        height: buttonSize,
        zIndex: 60,
        x: dragX,
        y: dragY,
        scale: scale,
      }}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          !isDragging && setTheme(theme === "light" ? "dark" : "light")
        }
        className="w-12 h-12 rounded-3xl active:cursor-grabbing cursor-pointer bg-white dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800 active:bg-white dark:active:bg-gray-800"
      >
        <Sun className="h-[1.5rem] w-[1.5rem] dark:hidden" />
        <Moon className="hidden h-[1.5rem] w-[1.5rem] dark:block" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </motion.div>
  );
}
