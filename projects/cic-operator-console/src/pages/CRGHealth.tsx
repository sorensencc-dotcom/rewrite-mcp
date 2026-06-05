import { useHealth } from '../hooks/useCIC'

export default function CRGHealth() {
  const { data: health } = useHealth()

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">CRG Health</h1>

      <div className="grid grid-cols-2 gap-6">
        {health?.backends && Object.entries(health.backends).map(([name, isHealthy]) => (
          <div key={name} className="card">
            <h2 className="text-xl font-bold mb-4 capitalize">{name}</h2>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isHealthy ? 'Healthy' : 'Unhealthy'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Cache Status</h2>
        <div className="space-y-2">
          <p><strong>Cache Size:</strong> {health?.cache_size} items</p>
          <p><strong>Last Updated:</strong> {new Date(health?.timestamp || '').toLocaleString()}</p>
          <p><strong>Overall Status:</strong> <span className={health?.status === 'healthy' ? 'text-green-500' : 'text-yellow-500'}>{health?.status}</span></p>
        </div>
      </div>
    </div>
  )
}
