import React from 'react'

const items = [
  ['arbitration', 'Arbitration'],
  ['drift', 'Drift'],
  ['rollout', 'Rollout'],
  ['expansion', 'Expansion'],
  ['federation', 'Federation'],
  ['cognition', 'Cognition'],
  ['memos', 'Memos'],
]

export default function Sidebar({ panel, setPanel }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">CIC Control Plane</div>
      {items.map(([id, label]) => (
        <div
          key={id}
          className={
            panel === id ? 'sidebar-item active' : 'sidebar-item'
          }
          onClick={() => setPanel(id)}
        >
          {label}
        </div>
      ))}
    </aside>
  )
}
