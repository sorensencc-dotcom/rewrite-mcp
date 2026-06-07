/**
 * js/mas-efficacy.js
 * @version 1.0.0
 * @date 2026-05-21
 *
 * MAS Efficacy Lab & Delta Analysis Engine.
 * Quantifies the value of MAS interventions by comparing actuals vs counterfactuals.
 */

const MASEfficacy = (() => {
  'use strict';

  /**
   * Analyzes a window of introspection records to compute cumulative gains.
   * @param {Array} records - History of introspection records.
   * @returns {Object} Efficacy metrics.
   */
  function analyze(records) {
    if (!records || !records.length) {
      return {
        failuresAvoided: 0,
        instabilityPrevented: 0,
        latencySavedMs: 0,
        netPositiveRate: 0,
        interventions: 0
      };
    }

    let failuresAvoided = 0;
    let instabilityPrevented = 0;
    let netPositiveInterventions = 0;

    records.forEach(r => {
      const cf = r.counterfactuals;
      if (!cf) return;

      // Failures Avoided = Projected Failures (No Mit) - Actual Failures (With Mit)
      // Since we simulate projected failures, we use the delta.
      const deltaFailures = cf.noMitigation.projectedFailures - cf.withMitigation.projectedFailures;
      if (deltaFailures > 0) failuresAvoided += deltaFailures;

      // Instability Prevented = (Projected TTI (No Mit) < Actual TTI (With Mit))
      if (cf.withMitigation.projectedTTI > cf.noMitigation.projectedTTI) {
        instabilityPrevented += (cf.withMitigation.projectedTTI - cf.noMitigation.projectedTTI);
      }

      // Net Positive = If confidence was high and TTI improved
      if (r.confidence > 0.7 && cf.withMitigation.projectedTTI > cf.noMitigation.projectedTTI) {
        netPositiveInterventions++;
      }
    });

    return {
      failuresAvoided,
      instabilityPrevented: Math.round(instabilityPrevented),
      netPositiveRate: Math.round((netPositiveInterventions / records.length) * 100),
      interventions: records.length
    };
  }

  return { analyze };
})();

window.MASEfficacy = MASEfficacy;
