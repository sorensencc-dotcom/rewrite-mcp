/**
 * Validators for lead scoring inputs and outputs
 */
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
export function validateScoringInput(input) {
    if (!input || typeof input !== 'object') {
        throw new ValidationError('ScoringInput must be an object');
    }
    const i = input;
    // Check complexity
    if (!i.complexity || typeof i.complexity !== 'object') {
        throw new ValidationError('ScoringInput.complexity is required');
    }
    const complexity = i.complexity;
    if (typeof complexity.score !== 'number') {
        throw new ValidationError('complexity.score must be a number');
    }
    // Check audit
    if (!i.audit || typeof i.audit !== 'object') {
        throw new ValidationError('ScoringInput.audit is required');
    }
    const audit = i.audit;
    if (!Array.isArray(audit.issues)) {
        throw new ValidationError('audit.issues must be an array');
    }
    if (typeof audit.total !== 'number') {
        throw new ValidationError('audit.total must be a number');
    }
    // Check accessibility
    if (!i.accessibility || typeof i.accessibility !== 'object') {
        throw new ValidationError('ScoringInput.accessibility is required');
    }
    const accessibility = i.accessibility;
    if (typeof accessibility.score !== 'number') {
        throw new ValidationError('accessibility.score must be a number');
    }
    return true;
}
export function validateLeadScoreResult(result) {
    if (!result || typeof result !== 'object') {
        throw new ValidationError('LeadScoreResult must be an object');
    }
    const r = result;
    if (typeof r.score !== 'number' || r.score < 0 || r.score > 100) {
        throw new ValidationError('score must be a number between 0 and 100');
    }
    if (!['A', 'B', 'C', 'D'].includes(r.tier)) {
        throw new ValidationError('tier must be A, B, C, or D');
    }
    if (typeof r.summary !== 'string') {
        throw new ValidationError('summary must be a string');
    }
    if (!Array.isArray(r.insights) || !r.insights.every(i => typeof i === 'string')) {
        throw new ValidationError('insights must be an array of strings');
    }
    if (!Array.isArray(r.recommendations) || !r.recommendations.every(r => typeof r === 'string')) {
        throw new ValidationError('recommendations must be an array of strings');
    }
    if (typeof r.salesReady !== 'boolean') {
        throw new ValidationError('salesReady must be a boolean');
    }
    return true;
}
export function validateIRPacket(packet) {
    if (!packet || typeof packet !== 'object') {
        throw new ValidationError('IRPacket must be an object');
    }
    const p = packet;
    if (typeof p.version !== 'string') {
        throw new ValidationError('version must be a string');
    }
    if (!p.meta || typeof p.meta !== 'object') {
        throw new ValidationError('meta is required');
    }
    const meta = p.meta;
    if (typeof meta.url !== 'string') {
        throw new ValidationError('meta.url must be a string');
    }
    if (!Array.isArray(p.routes)) {
        throw new ValidationError('routes must be an array');
    }
    if (!Array.isArray(p.components)) {
        throw new ValidationError('components must be an array');
    }
    if (!p.assets || typeof p.assets !== 'object') {
        throw new ValidationError('assets is required');
    }
    return true;
}
export function assertValid(validator, input, context) {
    try {
        if (!validator(input)) {
            throw new ValidationError(`Invalid ${context}`);
        }
    }
    catch (error) {
        if (error instanceof ValidationError)
            throw error;
        throw new ValidationError(`${context} validation failed: ${String(error)}`);
    }
}
