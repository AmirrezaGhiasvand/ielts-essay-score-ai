"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { AlarmClock, Pause, Play, Square } from "lucide-react";
import Countdown, { zeroPad } from "react-countdown";

gsap.registerPlugin(Draggable);

const MARGIN = 32;

function Timer({
  setTestExamMode,
}: {
  setTestExamMode: Dispatch<SetStateAction<boolean>>;
}) {
  const countdownRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const initialTime = useRef(Date.now() + 40 * 60 * 1000);

  const renderer = ({ minutes, seconds, completed }: any) => {
    if (completed) {
      return <span className="text-2xl">00:00</span>;
    }

    return (
      <span className="text-2xl">
        {zeroPad(minutes)}:{zeroPad(seconds)}
      </span>
    );
  };

  const handlePause = () => {
    countdownRef.current?.pause();
    setIsPaused(true);
  };

  const handleStart = () => {
    countdownRef.current?.start();
    setIsPaused(false);
  };

  const handleReset = () => {
    setTestExamMode(false);
  };

  return (
    <div className="flex justify-center items-center gap-4">
      <AlarmClock />

      <Countdown
        ref={countdownRef}
        date={initialTime.current}
        onComplete={() => setTestExamMode(false)}
        renderer={renderer}
        autoStart={true}
      />

      {isPaused ? (
        <Play className="text-green-500 cursor-pointer" onClick={handleStart} />
      ) : (
        <Pause
          className="text-green-500 cursor-pointer"
          onClick={handlePause}
        />
      )}

      <Square className="text-red-500 cursor-pointer" onClick={handleReset} />
    </div>
  );
}

export default function DraggableTimer({
  setTestExamMode,
}: {
  setTestExamMode: Dispatch<SetStateAction<boolean>>;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    const element = buttonRef.current;

    // Snap to top-left on start
    gsap.set(element, {
      position: "fixed", // ensure it stays fixed
      top: 0,
      left: 0,
      x: MARGIN,
      y: MARGIN,
    });

    const draggable = Draggable.create(element, {
      type: "x,y",
      bounds: window,
      inertia: false,
      edgeResistance: 0.75,
      dragClickables: true,

      onDragEnd() {
        const rect = element.getBoundingClientRect();

        const corners = [
          { x: MARGIN, y: MARGIN }, // top-left
          { x: window.innerWidth - rect.width - MARGIN, y: MARGIN }, // top-right
          { x: MARGIN, y: window.innerHeight - rect.height - MARGIN }, // bottom-left
          {
            x: window.innerWidth - rect.width - MARGIN,
            y: window.innerHeight - rect.height - MARGIN,
          }, // bottom-right
        ];

        const nearest = corners.reduce((closest, corner) => {
          const closestDistance = Math.hypot(
            rect.left - closest.x,
            rect.top - closest.y,
          );

          const currentDistance = Math.hypot(
            rect.left - corner.x,
            rect.top - corner.y,
          );

          return currentDistance < closestDistance ? corner : closest;
        });

        gsap.to(element, {
          x: this.x + (nearest.x - rect.left),
          y: this.y + (nearest.y - rect.top),
          duration: 0.35,
          ease: "power3.out",
        });
      },
    })[0];

    const handleResize = () => {
      const rect = element.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - MARGIN;
      const maxY = window.innerHeight - rect.height - MARGIN;

      // Clamp position on resize
      gsap.set(element, {
        x: Math.min(Math.max(draggable.x, MARGIN), maxX),
        y: Math.min(Math.max(draggable.y, MARGIN), maxY),
      });

      draggable.update();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      draggable.kill();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={buttonRef}
      className="
    fixed z-50 flex h-16 max-w-60
    cursor-grab active:cursor-grabbing
    items-center justify-center
    rounded-2xl p-5
    bg-muted text-text
    shadow-[0_0_20px_rgba(255,255,255,0.08),0_0_40px_rgba(255,255,255,0.05)]
    ring-1 ring-text/30
  "
    >
      <Timer setTestExamMode={setTestExamMode} />
    </div>
  );
}
