/**
 * Validators for lead scoring inputs and outputs
 */
import type { ScoringInput, LeadScoreResult } from '../schemas/lead-score.types.js';
import type { IRPacket } from '../schemas/ir.types.js';
export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare function validateScoringInput(input: unknown): input is ScoringInput;
export declare function validateLeadScoreResult(result: unknown): result is LeadScoreResult;
export declare function validateIRPacket(packet: unknown): packet is IRPacket;
export declare function assertValid<T>(validator: (input: unknown) => input is T, input: unknown, context: string): asserts input is T;
