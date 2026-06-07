import { useState } from 'react'
import { CIC } from '../lib/cicClient'
import { useFlowExecution } from '../hooks/useCIC'

export default function FlowExplorer() {
  const [executionId, setExecutionId] = useState('')
  const [activeExecution, setActiveExecution] = useState('')
  const { data: execution, isLoading } = useFlowExecution(activeExecution)

  const handleExecuteFlow = async (flowId: string) => {
    try {
      const res = await CIC.executeFlow(flowId, {}, `trace-${Date.now()}`)
      setActiveExecution(res.data.execution_id)
    } catch (err) {
      console.error('Flow execution failed:', err)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cic-accent">Flow Explorer</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Execute Flow</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Flow Template ID:</label>
            <input
              type="text"
              value={executionId}
              onChange={(e) => setExecutionId(e.target.value)}
              placeholder="e.g., flow-context-enrichment-v1"
              className="w-full bg-cic-muted border border-cic-border rounded p-2 text-white"
            />
          </div>
          <button
            onClick={() => handleExecuteFlow(executionId)}
            className="button-primary"
          >
            Execute Flow
          </button>
        </div>
      </div>

      {activeExecution && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Execution {activeExecution}</h2>
          {isLoading ? (
            <p>Loading execution details...</p>
          ) : execution ? (
            <div className="space-y-4">
              <div>
                <p><strong>Status:</strong> <span className={execution.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}>{execution.status}</span></p>
                <p><strong>Trace ID:</strong> {execution.trace_id}</p>
              </div>

              <div>
                <h3 className="font-bold mb-2">Stages</h3>
                <div className="space-y-2">
                  {execution.spans?.map((span) => (
                    <div key={span.id} className="bg-cic-border p-2 rounded text-sm">
                      <p><strong>{span.agent}</strong> - {span.status}</p>
                    </div>
                  ))}
                </div>
              </div>

              {execution.output && (
                <div>
                  <h3 className="font-bold mb-2">Output</h3>
                  <pre className="bg-cic-border p-4 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p>No execution data</p>
          )}
        </div>
      )}
    </div>
  )
}
