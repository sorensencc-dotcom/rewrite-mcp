// DiffOverlay.tsx

import { DiffFrame } from "./DiffFrame";
import { OverlayFrames } from "./OverlayFrames";

interface DiffOverlayProps {
  beforeHtml: string;
  afterHtml: string;
  changedSelectors: string[];
  mode: "side-by-side" | "overlay";
}

export function DiffOverlay({ beforeHtml, afterHtml, changedSelectors, mode }: DiffOverlayProps) {
  return (
    <div className="w-full h-full bg-slate-950 flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        {mode === "side-by-side" ? (
          <div className="grid grid-cols-2 h-full gap-px bg-slate-900">
            <DiffFrame html={beforeHtml} changedSelectors={changedSelectors} label="BEFORE" />
            <DiffFrame html={afterHtml} changedSelectors={changedSelectors} label="AFTER" />
          </div>
        ) : (
          <OverlayFrames 
            beforeHtml={beforeHtml} 
            afterHtml={afterHtml} 
            changedSelectors={changedSelectors} 
          />
        )}
      </div>
    </div>
  );
}
