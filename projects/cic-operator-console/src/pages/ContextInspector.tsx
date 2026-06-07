import { useState } from 'react'
import { useContext } from '../hooks/useCIC'

export default function ContextInspector() {
  const [contextId, setContextId] = useState('')
  const { data: context, isLoading } = useContext(contextId)

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Context Inspector</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Load Context</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Context ID:</label>
            <input
              type="text"
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              placeholder="e.g., ctx-abc123"
              className="w-full bg-cic-muted border border-cic-border rounded p-2 text-white"
            />
          </div>
        </div>
      </div>

      {contextId && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Context Details</h2>
          {isLoading ? (
            <p>Loading context...</p>
          ) : context ? (
            <div className="space-y-4">
              <div>
                <p><strong>ID:</strong> {context.id}</p>
                <p><strong>Type:</strong> {context.type}</p>
                <p><strong>Trace ID:</strong> {context.trace_id}</p>
              </div>

              {context.minimal && (
                <div>
                  <h3 className="font-bold mb-2">Minimal Context</h3>
                  <pre className="bg-cic-border p-4 rounded text-sm overflow-auto max-h-48">
                    {JSON.stringify(context.minimal, null, 2)}
                  </pre>
                </div>
              )}

              {context.code && (
                <div>
                  <h3 className="font-bold mb-2">Code Context</h3>
                  <div className="space-y-2">
                    <p><strong>Repo:</strong> {context.code.repo}</p>
                    <p><strong>Files:</strong> {context.code.files?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Enter a context ID to load</p>
          )}
        </div>
      )}
    </div>
  )
}
