module.exports = async function costOptimizer(params) {
  try {
    const { action = 'analyze', timeRange = '7d', groupBy = 'skill' } = params || {};

    if (action && !['analyze', 'forecast', 'suggest', 'report'].includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

  const costs = {
    'claude-api': 800,
    'gcp-run': 300,
    'azure-function': 150.50
  };

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

  switch (action) {
    case 'analyze':
      return {
        period: `${getDateRange(timeRange).start} to ${getDateRange(timeRange).end}`,
        totalCost,
        breakdown: costs,
        trends: [{ date: new Date().toISOString().split('T')[0], cost: totalCost, delta: '+5%' }]
      };

    case 'forecast':
      return {
        period: 'next 30 days',
        forecast: { week: totalCost * 1.05, month: totalCost * 4.2 }
      };

    case 'suggest':
      return {
        suggestions: [
          { skill: 'agent-drift-detector', savings: '10%', action: 'cache results' },
          { workflow: 'pipeline-orchestration', savings: '15%', action: 'reduce frequency' }
        ]
      };

    default:
      return { totalCost, breakdown: costs };
    }
  } catch (error) {
    throw new Error(`Cost optimizer error: ${error.message}`);
  }
};

function getDateRange(range) {
  const end = new Date();
  const start = new Date();
  const days = parseInt(range) || 7;
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}
