# Meta-Evolution Ranker

## Purpose
Ranks and prioritizes evolution proposals based on predicted impact, risk, stability implications, subsystem priority, and operator-defined preferences.

## Ranking Inputs
- evolution proposals
- simulation results
- audit anomalies
- subsystem health metrics
- operator priorities
- historical success rates

## Ranking Criteria
Each proposal is scored on:
- impact_score
- risk_score
- stability_score
- subsystem_priority_score
- operator_priority_score
- confidence_score

## Scoring Model
impact_score:
  - derived from predicted performance delta
risk_score:
  - derived from predicted risk delta
stability_score:
  - derived from predicted stability delta
subsystem_priority_score:
  - derived from operator-defined subsystem weights
operator_priority_score:
  - derived from explicit operator preferences
confidence_score:
  - derived from simulation confidence

## Composite Ranking Formula
final_score = 
  (impact_score * 0.35) +
  (stability_score * 0.25) +
  (operator_priority_score * 0.20) +
  (subsystem_priority_score * 0.10) -
  (risk_score * 0.10)

## Ranking Output Schema
Each ranked item must include:
- proposal_id
- subsystem
- final_score
- rank
- impact_score
- risk_score
- stability_score
- operator_priority_score
- confidence_score
- recommended_action

## Ranking Rules
1. Highest final_score ranks first
2. Critical-risk proposals cannot rank above moderate-risk proposals
3. Operator-priority proposals receive deterministic boosts
4. Ties resolved by:
   - higher confidence_score
   - then lower risk_score
   - then lexical ordering of proposal_id

## Operator Controls
Operator may:
- adjust subsystem weights
- adjust priority boosts
- manually reorder proposals
- freeze proposals
- reject proposals
- approve proposals

## Logging Requirements
Each ranking cycle must log:
- timestamp
- number of proposals ranked
- top-ranked proposal
- risk distribution
- operator overrides applied