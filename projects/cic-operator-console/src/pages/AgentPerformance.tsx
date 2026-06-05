import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const sampleData = [
  { agent: 'code-analyzer', latency: 234, success: 98 },
  { agent: 'narrative-linker', latency: 145, success: 99 },
  { agent: 'test-writer', latency: 567, success: 95 },
  { agent: 'refactor-agent', latency: 423, success: 97 },
  { agent: 'security-agent', latency: 312, success: 98 },
]

export default function AgentPerformance() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Agent Performance</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Latency by Agent</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sampleData}>
            <CartesianGrid stroke="#333" />
            <XAxis dataKey="agent" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00ff88' }} />
            <Legend />
            <Bar dataKey="latency" fill="#00ff88" name="Latency (ms)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Success Rate by Agent</h2>
        <div className="space-y-2">
          {sampleData.map((agent) => (
            <div key={agent.agent} className="flex justify-between items-center">
              <span>{agent.agent}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-cic-border rounded h-4">
                  <div
                    className="bg-cic-accent h-4 rounded"
                    style={{ width: `${agent.success}%` }}
                  />
                </div>
                <span>{agent.success}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
