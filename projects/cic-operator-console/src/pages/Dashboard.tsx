import { useHealth, useMetrics } from '../hooks/useCIC'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { data: health, isLoading: healthLoading } = useHealth()
  const { data: metrics, isLoading: metricsLoading } = useMetrics()

  if (healthLoading || metricsLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Dashboard</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Service Health</h2>
          <div className="space-y-2">
            <p>Status: <span className={health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}>{health?.status}</span></p>
            <p>Cache Size: {health?.cache_size} items</p>
            <p>Timestamp: {new Date(health?.timestamp || '').toLocaleString()}</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Request Metrics</h2>
          <div className="space-y-2">
            <p>Total Requests: {metrics?.request_count}</p>
            <p>Avg Latency: {metrics?.avg_latency_ms}ms</p>
            <p>Error Rate: {(metrics?.error_rate || 0).toFixed(2)}%</p>
            <p>Cache Hit Rate: {(metrics?.cache_hit_rate || 0).toFixed(2)}%</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Latency Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={[{ name: 'Sample', latency: (metrics?.avg_latency_ms || 0) }]}>
            <CartesianGrid stroke="#333" />
            <XAxis stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00ff88' }} />
            <Legend />
            <Line type="monotone" dataKey="latency" stroke="#00ff88" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
