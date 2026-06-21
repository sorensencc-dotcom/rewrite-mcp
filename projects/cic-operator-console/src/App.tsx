import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import FlowExplorer from './pages/FlowExplorer'
import AgentPerformance from './pages/AgentPerformance'
import ContextInspector from './pages/ContextInspector'
import CRGHealth from './pages/CRGHealth'
import Metrics from './pages/Metrics'
import Settings from './pages/Settings'
import ChatEditor from './pages/ChatEditor'
import ConsoleV3 from './pages/ConsoleV3'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex h-screen bg-cic-dark text-white font-mono">
          <nav className="w-64 bg-black border-r border-cic-border p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-cic-accent mb-8">CIC</h1>
            <ul className="space-y-2">
              <li><Link to="/" className="block p-2 rounded hover:bg-cic-muted transition">Dashboard</Link></li>
              <li><Link to="/chat-editor" className="block p-2 rounded hover:bg-cic-muted transition text-amber-500 font-bold">Chat Editor (RL-4.3)</Link></li>
              <li><Link to="/flows" className="block p-2 rounded hover:bg-cic-muted transition">Flow Explorer</Link></li>
              <li><Link to="/agents" className="block p-2 rounded hover:bg-cic-muted transition">Agent Performance</Link></li>
              <li><Link to="/context" className="block p-2 rounded hover:bg-cic-muted transition">Context Inspector</Link></li>
              <li><Link to="/crg" className="block p-2 rounded hover:bg-cic-muted transition">CRG Health</Link></li>
              <li><Link to="/metrics" className="block p-2 rounded hover:bg-cic-muted transition">Metrics</Link></li>
              <li><Link to="/settings" className="block p-2 rounded hover:bg-cic-muted transition">Settings</Link></li>
              <li><Link to="/console-v3" className="block p-2 rounded hover:bg-cic-muted transition text-indigo-400 font-bold">Console v3</Link></li>
            </ul>
          </nav>

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat-editor" element={<ChatEditor />} />
              <Route path="/flows" element={<FlowExplorer />} />
              <Route path="/agents" element={<AgentPerformance />} />
              <Route path="/context" element={<ContextInspector />} />
              <Route path="/crg" element={<CRGHealth />} />
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/console-v3" element={<ConsoleV3 />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
