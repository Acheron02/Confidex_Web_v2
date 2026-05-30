"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __confidexHomeReady?: boolean;
  }
}

export default function HomeReadySignal() {
  const dispatchedRef = useRef(false);

  useEffect(() => {
    window.__confidexHomeReady = false;

    const dispatchReady = () => {
      if (dispatchedRef.current) return;

      dispatchedRef.current = true;
      window.__confidexHomeReady = true;
      window.dispatchEvent(new Event("confidex:home-ready"));
    };

    const frameOne = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(dispatchReady);
    });

    const fallbackTimer = window.setTimeout(dispatchReady, 900);

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
