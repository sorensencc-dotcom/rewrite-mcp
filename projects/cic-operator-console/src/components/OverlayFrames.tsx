import { useState } from "react";
import { DiffFrame } from "./DiffFrame";

interface OverlayFramesProps {
  beforeHtml: string;
  afterHtml: string;
  changedSelectors: string[];
}

export function OverlayFrames({ beforeHtml, afterHtml, changedSelectors }: OverlayFramesProps) {
  const [alpha, setAlpha] = useState<number>(0.5);

  return (
    <div className="w-full h-full relative">
      {/* Background Frame: Before State */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <DiffFrame html={beforeHtml} changedSelectors={[]} label="BEFORE" />
      </div>

      {/* Foreground Frame: After State with Opacity */}
      <div 
        className="absolute inset-0 z-20 w-full h-full transition-opacity duration-75"
        style={{ opacity: alpha }}
      >
        <DiffFrame html={afterHtml} changedSelectors={changedSelectors} label="AFTER (OVERLAY)" />
      </div>

      {/* Floating Range Slider Control */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md w-72">
        <span className="text-[10px] font-bold font-mono text-slate-500">BEFORE</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={alpha}
          onChange={(e) => setAlpha(parseFloat(e.target.value))}
          className="flex-1 accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-[10px] font-bold font-mono text-amber-500">AFTER</span>
      </div>
    </div>
  );
}
