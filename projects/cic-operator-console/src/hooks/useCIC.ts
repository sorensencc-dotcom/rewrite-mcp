import { useQuery } from '@tanstack/react-query'
import { CIC, Context, HealthStatus, Metrics } from '../lib/cicClient'

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await CIC.health()
      return res.data.health
    },
    refetchInterval: 30000
  })

export const useContext = (id: string) =>
  useQuery({
    queryKey: ['context', id],
    queryFn: async () => {
      const res = await CIC.getContext(id, `trace-${Date.now()}`)
      return res.data.context
    },
    enabled: !!id
  })

export const useMetrics = () =>
  useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await CIC.metrics()
      return res.data
    },
    refetchInterval: 60000
  })

export const useFlowExecution = (executionId: string) =>
  useQuery({
    queryKey: ['flow', executionId],
    queryFn: async () => {
      const res = await CIC.getFlowExecution(executionId)
      return res.data.execution
    },
    enabled: !!executionId,
    refetchInterval: (data) => data?.status === 'running' ? 2000 : false
  })
