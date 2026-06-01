import React from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'

import ArbitrationPanel from './panels/ArbitrationPanel.jsx'
import DriftPanel from './panels/DriftPanel.jsx'
import RolloutPanel from './panels/RolloutPanel.jsx'
import ExpansionPanel from './panels/ExpansionPanel.jsx'
import FederationPanel from './panels/FederationPanel.jsx'
import CognitionPanel from './panels/CognitionPanel.jsx'
import MemosPanel from './panels/MemosPanel.jsx'

export default function App() {
  const [panel, setPanel] = React.useState('cognition')

  const panels = {
    arbitration: <ArbitrationPanel />,
    drift: <DriftPanel />,
    rollout: <RolloutPanel />,
    expansion: <ExpansionPanel />,
    federation: <FederationPanel />,
    cognition: <CognitionPanel />,
    memos: <MemosPanel />,
  }

  return (
    <div className="dashboard">
      <Sidebar panel={panel} setPanel={setPanel} />
      <div className="main">
        <Topbar />
        <div className="panel">{panels[panel]}</div>
      </div>
    </div>
  )
}
