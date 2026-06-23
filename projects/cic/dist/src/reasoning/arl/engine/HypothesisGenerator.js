export function generateHypotheses(premises) {
    const hypotheses = [];
    // H1: Direct claim acceptance (each claim as-is)
    premises.claims.forEach((claim, idx) => {
        hypotheses.push({
            description: claim,
            likelihood: 0.5 // neutral prior
        });
    });
    // H2: Entity-based interpretations (what entities imply)
    premises.entities.forEach(entity => {
        hypotheses.push({
            description: `${entity} is a central element`,
            likelihood: 0.4
        });
    });
    // H3: Relationship-based consequences
    premises.relationships.forEach(rel => {
        hypotheses.push({
            description: `Consequence: ${rel} implies interaction`,
            likelihood: 0.45
        });
    });
    // H4: Compound interpretations (multiple claims together)
    if (premises.claims.length >= 2) {
        for (let i = 0; i < premises.claims.length - 1; i++) {
            const combined = `${premises.claims[i].substring(0, 30)}... AND ${premises.claims[i + 1].substring(0, 30)}...`;
            hypotheses.push({
                description: combined,
                likelihood: 0.35
            });
        }
    }
    return hypotheses;
}
//# sourceMappingURL=HypothesisGenerator.js.map