// File: projects/cic/src/memory/MemoryExplorer.tsx | Date: 2026-06-03 | v1.0.0

import React, { useState, useEffect } from "react";

interface MemoryEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export const MemoryExplorer: React.FC = () => {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchEvents();
  }, [filterType]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const url = filterType ? `/v1/memory/events?type=${filterType}` : "/v1/memory/events";
      const response = await fetch(url);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch memory events", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: "20px",
      fontFamily: "'Inter', sans-serif",
      color: "#e2e8f0",
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      border: "1px solid #1e293b",
      backdropFilter: "blur(10px)"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px", color: "#f8fafc" }}>
        CIC Memory Explorer
      </h2>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="event-filter" style={{ marginRight: "8px", fontSize: "0.875rem", color: "#94a3b8" }}>
          Filter Event Type:
        </label>
        <select
          id="event-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            backgroundColor: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            borderRadius: "6px",
            padding: "6px 12px",
            outline: "none"
          }}
        >
          <option value="">All Events</option>
          <option value="roadmap.delta">Roadmap Delta</option>
          <option value="pipeline.run">Pipeline Run</option>
          <option value="sandbox.decision">Sandbox Decision</option>
          <option value="docs.build">Docs Build</option>
          <option value="agent.output">Agent Output</option>
          <option value="lane.progress">Lane Progress</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ color: "#94a3b8" }}>Loading events...</div>
      ) : (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {events.length === 0 ? (
            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No events found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                  <th style={{ padding: "10px", color: "#94a3b8" }}>ID</th>
                  <th style={{ padding: "10px", color: "#94a3b8" }}>Type</th>
                  <th style={{ padding: "10px", color: "#94a3b8" }}>Timestamp</th>
                  <th style={{ padding: "10px", color: "#94a3b8" }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px", fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {event.id}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#334155",
                        color: "#f8fafc"
                      }}>
                        {event.type}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.85rem", color: "#94a3b8" }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.85rem" }}>
                      <pre style={{ margin: 0, overflowX: "auto" }}>
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
