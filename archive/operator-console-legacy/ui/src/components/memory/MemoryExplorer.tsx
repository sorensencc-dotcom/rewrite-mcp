// File: projects/cic/ui/src/components/memory/MemoryExplorer.tsx | Date: 2026-06-03 | v1.0.0

import React, { useEffect, useState } from "react";

interface MemoryEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export function MemoryExplorer() {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [trends, setTrends] = useState<any>({});

  useEffect(() => {
    fetch("/v1/memory/events")
      .then(r => r.json())
      .then(setEvents)
      .catch(err => console.error("Error fetching memory events:", err));

    fetch("/v1/memory/trends")
      .then(r => r.json())
      .then(setTrends)
      .catch(err => console.error("Error fetching memory trends:", err));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", color: "#e2e8f0", backgroundColor: "#0f172a" }}>
      <h1>CIC Memory Explorer</h1>

      <section>
        <h2>Timeline</h2>
        <ul>
          {events.map(e => (
            <li key={e.id}>
              <strong>{e.type}</strong> — {e.timestamp}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Trends</h2>
        <pre>{JSON.stringify(trends, null, 2)}</pre>
      </section>
    </div>
  );
}
