module.exports = async function multiEndpointOrchestrator(params) {
  try {
    if (!params || !params.endpoints || !Array.isArray(params.endpoints)) {
      throw new Error('endpoints array required');
    }

    if (params.endpoints.length === 0) {
      throw new Error('endpoints array must not be empty');
    }

  const {
    endpoints,
    sequentialMode = true,
    timeout = 60000,
    fallbackStrategy = 'skip-failed'
  } = params;

  const results = [];
  const startTime = Date.now();
  let failureCount = 0;
  let fallbacksApplied = 0;

  const invokeEndpoint = async (endpoint, index) => {
    const { service, skill, params: endpointParams = {} } = endpoint;
    const endpointId = `${service}:${skill}`;

    try {
      const result = {
        index,
        service,
        skill,
        status: 'success',
        result: null,
        duration: 0
      };

      const startTime = Date.now();
      result.result = await invokeSkill(service, skill, endpointParams);
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      failureCount++;

      if (fallbackStrategy === 'retry-3x') {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await invokeSkill(service, skill, endpointParams);
            fallbacksApplied++;
            return {
              index,
              service,
              skill,
              status: 'success-retry',
              result,
              duration: Date.now() - startTime,
              retryAttempt: attempt
            };
          } catch (retryError) {
            if (attempt === 3) {
              return {
                index,
                service,
                skill,
                status: 'failed',
                error: retryError.message,
                failureCount: attempt
              };
            }
          }
        }
      } else if (fallbackStrategy === 'use-default') {
        fallbacksApplied++;
        return {
          index,
          service,
          skill,
          status: 'default',
          result: endpoint.defaultValue || null,
          error: error.message
        };
      } else {
        return {
          index,
          service,
          skill,
          status: 'failed',
          error: error.message
        };
      }
    }
  };

  if (sequentialMode) {
    for (const endpoint of endpoints) {
      const result = await invokeEndpoint(endpoint, results.length);
      results.push(result);

      if (result.status === 'failed' && endpoint.onError === 'stop') {
        break;
      }
    }
  } else {
    const promises = endpoints.map((endpoint, idx) => invokeEndpoint(endpoint, idx));
    const parallelResults = await Promise.allSettled(promises);
    parallelResults.forEach(outcome => {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        results.push({ status: 'failed', error: outcome.reason.message });
      }
    });
  }

    return {
      results,
      executionTime: Date.now() - startTime,
      failureCount,
      fallbacksApplied,
      successCount: results.filter(r => r.status.startsWith('success')).length
    };
  } catch (error) {
    throw new Error(`Multi-endpoint orchestrator error: ${error.message}`);
  }
};

async function invokeSkill(service, skill, params) {
  if (!service || !skill) throw new Error('service and skill required');
  return { service, skill, params, invoked: true };
}
