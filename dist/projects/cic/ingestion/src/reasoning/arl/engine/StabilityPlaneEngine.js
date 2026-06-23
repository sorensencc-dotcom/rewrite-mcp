"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StabilityPlaneEngine = void 0;
class StabilityPlaneEngine {
    generatePlane(aggregate, runs) {
        return {
            id: `plane-${Date.now()}`,
            timestamp: new Date().toISOString(),
            driftVectorField: this.computeDriftVectorField(aggregate),
            compositeReasoningHeatmap: this.computeCompositeReasoningHeatmap(runs),
            confidenceTrajectory: this.computeConfidenceTrajectory(runs),
            narrativeRiskRadar: this.computeNarrativeRiskRadar(aggregate),
            multiRunTrendLine: this.computeMultiRunTrendLine(runs),
            overallStabilityScore: aggregate.stabilityScore,
        };
    }
    computeDriftVectorField(aggregate) {
        return {
            x: aggregate.rollingDriftAverage,
            y: aggregate.rollingContradictionAverage,
            z: aggregate.rollingSemanticAverage,
            magnitude: Math.sqrt(Math.pow(aggregate.rollingDriftAverage, 2) +
                Math.pow(aggregate.rollingContradictionAverage, 2) +
                Math.pow(aggregate.rollingSemanticAverage, 2)),
        };
    }
    computeCompositeReasoningHeatmap(runs) {
        const gridSize = 10;
        const values = [];
        for (let i = 0; i < gridSize; i++) {
            const row = [];
            for (let j = 0; j < gridSize; j++) {
                const runIndex = Math.floor((i * gridSize + j) / (gridSize * gridSize) * runs.length);
                const run = runs[Math.min(runIndex, runs.length - 1)];
                row.push(1 - run.driftScore);
            }
            values.push(row);
        }
        return {
            gridSize,
            values,
            maxValue: 1.0,
            minValue: 0.0,
        };
    }
    computeConfidenceTrajectory(runs) {
        const timestamps = runs.map((r) => r.timestamp);
        const values = runs.map((r) => 1 - r.contradictionScore);
        let trend = 'stable';
        if (runs.length > 1) {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            if (secondAvg > firstAvg + 0.05) {
                trend = 'increasing';
            }
            else if (secondAvg < firstAvg - 0.05) {
                trend = 'decreasing';
            }
        }
        return { timestamps, values, trend };
    }
    computeNarrativeRiskRadar(aggregate) {
        const categories = ['Drift Risk', 'Contradiction Risk', 'Semantic Risk'];
        const values = [
            aggregate.rollingDriftAverage,
            aggregate.rollingContradictionAverage,
            1 - aggregate.rollingSemanticAverage,
        ];
        const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
        let riskLevel = 'low';
        if (avgRisk > 0.6) {
            riskLevel = 'high';
        }
        else if (avgRisk > 0.3) {
            riskLevel = 'medium';
        }
        return { categories, values, riskLevel };
    }
    computeMultiRunTrendLine(runs) {
        return {
            runIds: runs.map((r) => r.runId),
            timestamps: runs.map((r) => r.timestamp),
            driftTrend: runs.map((r) => r.driftScore),
            contradictionTrend: runs.map((r) => r.contradictionScore),
            semanticTrend: runs.map((r) => r.semanticScore),
        };
    }
}
exports.StabilityPlaneEngine = StabilityPlaneEngine;
//# sourceMappingURL=StabilityPlaneEngine.js.map