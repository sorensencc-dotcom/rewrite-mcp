// File: projects/cic/ui/src/components/Sidebar.tsx | Date: 2026-06-03 | v1.0.0

import React from "react";

export function Sidebar() {
  return (
    <aside style={{ width: "240px", backgroundColor: "#1e293b", padding: "16px" }}>
      <nav>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          <li>
            <a href="/dashboard" style={{ color: "#cbd5e1", textDecoration: "none" }}>Dashboard</a>
          </li>
          <li>
            <a href="/memory" style={{ color: "#cbd5e1", textDecoration: "none" }}>Memory Explorer</a>
          </li>
          <li>
            <a href="/skills" style={{ color: "#cbd5e1", textDecoration: "none" }}>Skill Explorer</a>
          </li>
          <li>
            <a href="/apr" style={{ color: "#cbd5e1", textDecoration: "none" }}>Planner Console</a>
          </li>
          <li>
            <a href="/cro" style={{ color: "#cbd5e1", textDecoration: "none" }}>Execution Console</a>
          </li>
          <li>
            <a href="/knowledge" style={{ color: "#cbd5e1", textDecoration: "none" }}>Knowledge Graph</a>
          </li>
          <li>
            <a href="/mee" style={{ color: "#cbd5e1", textDecoration: "none" }}>Meta-Evolution Console</a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
