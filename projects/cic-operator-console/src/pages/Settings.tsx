export default function Settings() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Settings</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2"><strong>CIC API URL</strong></label>
            <input
              type="text"
              defaultValue={import.meta.env.VITE_CIC_API_URL || 'http://localhost:8080'}
              disabled
              className="w-full bg-cic-muted border border-cic-border rounded p-2 text-white opacity-50"
            />
            <p className="text-sm text-gray-400 mt-1">Set VITE_CIC_API_URL env var to change</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Flow Registry</h2>
        <p className="text-gray-400 mb-4">Available flow templates:</p>
        <div className="space-y-2">
          {[
            'flow-context-enrichment-v1',
            'flow-idea-classification-v1',
            'flow-deep-review-v1',
            'flow-refactor-sprint-v1'
          ].map((flow) => (
            <div key={flow} className="bg-cic-border p-2 rounded text-sm">
              {flow}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Agent Registry</h2>
        <p className="text-gray-400 mb-4">Registered agents:</p>
        <div className="space-y-2">
          {[
            'code-analyzer',
            'narrative-linker',
            'test-writer',
            'refactor-agent',
            'security-agent'
          ].map((agent) => (
            <div key={agent} className="bg-cic-border p-2 rounded text-sm flex justify-between items-center">
              <span>{agent}</span>
              <span className="text-cic-accent text-xs">● Ready</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
