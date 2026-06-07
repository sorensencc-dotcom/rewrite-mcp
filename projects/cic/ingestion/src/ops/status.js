const moment = require('moment'); // A robust time formatting library

// --- Health & Exit Codes ---

function evaluateHealth(data) {
    const { metrics, storage, lastEvents } = data;
    const health = metrics.health || {};
    const anomalies = metrics.anomalies || {};

    let overallStatus = 'OK'; // OK, WARN, ERROR
    const issues = [];

    // Rule: Any consumer ERROR
    const consumerStates = Object.values(health.consumers || {});
    if (consumerStates.some(s => s === 'ERROR')) {
        overallStatus = 'ERROR';
        issues.push('One or more consumers are in an ERROR state.');
    }
    
    // Rule: Any anomaly present
    if (anomalies.ingestion_gap_minutes > 0 || anomalies.memo_backlog > 0 || anomalies.cluster_drift) {
        if (overallStatus !== 'ERROR') overallStatus = 'WARN';
        issues.push('Anomalies detected.');
    }

    // Rule: Ingestion Gap thresholds
    if (anomalies.ingestion_gap_minutes > 30) {
        overallStatus = 'ERROR';
        issues.push('Ingestion gap is over 30 minutes.');
    } else if (anomalies.ingestion_gap_minutes > 5) {
        if (overallStatus !== 'ERROR') overallStatus = 'WARN';
        issues.push('Ingestion gap is over 5 minutes.');
    }
    
    // Rule: Storage unreachable
    if (storage.joplin === 'unreachable' || storage.memos === 'unreachable') {
        overallStatus = 'ERROR';
        issues.push('A required storage dependency is unreachable.');
    }

    // Rule: Last error < 5 minutes ago
    const lastError = (lastEvents || []).find(e => e.level === 'ERROR');
    if (lastError && moment().diff(moment(lastError.timestamp), 'minutes') < 5) {
        overallStatus = 'ERROR';
        issues.push('A critical error was logged in the last 5 minutes.');
    }

    return {
        overallStatus,
        issues,
        exitCode: getExitCode(overallStatus),
    };
}

function getExitCode(status) {
    switch (status) {
        case 'OK': return 0;
        case 'WARN': return 1;
        case 'ERROR': return 2;
        default: return 1;
    }
}

function getHealthSymbol(status) {
    switch (status) {
        case 'OK': return '✓';
        case 'WARN': return '!';
        case 'DEGRADED': return '!';
        case 'ERROR': return '✗';
        case 'NO_DATA': return '?';
        default: return '?';
    }
}

// --- Humanization ---

function humanizeDuration(timestamp) {
    if (!timestamp) return 'never';
    return moment(timestamp).fromNow();
}

module.exports = {
    evaluateHealth,
    getHealthSymbol,
    humanizeDuration,
};
