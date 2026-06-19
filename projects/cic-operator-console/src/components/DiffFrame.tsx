// DiffFrame.tsx


interface DiffFrameProps {
  html: string;
  changedSelectors: string[];
  label: string;
}

export function DiffFrame({ html, changedSelectors, label }: DiffFrameProps) {
  // Inject highlight styles dynamically
  const injectStyles = () => {
    if (changedSelectors.length === 0) return html;

    const highlightCss = `
      <style>
        /* Pulse border highlight */
        @keyframes rl-pulse-glow {
          0% { box-shadow: 0 0 4px #f59e0b; outline-color: rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 20px #f59e0b; outline-color: rgba(245, 158, 11, 1); }
          100% { box-shadow: 0 0 4px #f59e0b; outline-color: rgba(245, 158, 11, 0.4); }
        }
        ${changedSelectors.map(sel => `
          ${sel} {
            outline: 3px dashed #f59e0b !important;
            outline-offset: 4px !important;
            animation: rl-pulse-glow 2s infinite ease-in-out !important;
            background-color: rgba(245, 158, 11, 0.08) !important;
          }
        `).join("\n")}
      </style>
    `;
    
    // Inject before closing </head>
    if (html.includes("</head>")) {
      return html.replace("</head>", `${highlightCss}\n</head>`);
    }
    return html + highlightCss;
  };

  const processedHtml = injectStyles();

  return (
    <div className="relative h-full w-full flex flex-col bg-white">
      {/* Viewport label badge */}
      <div className="absolute top-3 left-3 z-30 bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-bold font-mono tracking-widest px-2.5 py-1 rounded text-slate-300">
        {label}
      </div>
      <iframe
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={processedHtml}
        title={label}
      />
    </div>
  );
}
