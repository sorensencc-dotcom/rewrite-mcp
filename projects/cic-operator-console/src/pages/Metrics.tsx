import { useMetrics } from '../hooks/useCIC'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Metrics() {
  const { data: metrics } = useMetrics()

  const chartData = [
    { name: 'Now', latency: metrics?.avg_latency_ms || 0, errorRate: metrics?.error_rate || 0 }
  ]

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Metrics</h1>

      <div className="grid grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Requests</h3>
          <p className="text-2xl font-bold">{metrics?.request_count || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Avg Latency</h3>
          <p className="text-2xl font-bold">{metrics?.avg_latency_ms || 0}ms</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Error Rate</h3>
          <p className="text-2xl font-bold">{(metrics?.error_rate || 0).toFixed(2)}%</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-400 mb-2">Cache Hit Rate</h3>
          <p className="text-2xl font-bold">{(metrics?.cache_hit_rate || 0).toFixed(2)}%</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Latency & Error Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid stroke="#333" />
            <XAxis stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #00ff88' }} />
            <Legend />
            <Area type="monotone" dataKey="latency" fill="#00ff88" stroke="#00ff88" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
