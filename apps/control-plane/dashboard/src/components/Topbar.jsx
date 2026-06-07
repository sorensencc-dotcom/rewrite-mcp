import React from 'react'

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-title">CIC OS — Operator Console</div>
      <div className="topbar-status">
        Runtime: <span className="badge ok">Healthy</span>
      </div>
    </header>
  )
}
