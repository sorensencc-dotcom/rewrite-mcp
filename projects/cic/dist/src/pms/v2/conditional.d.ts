/**
 * projects/cic/src/pms/v2/conditional.ts
 * Conditional block evaluator supporting standard boolean syntax.
 */
export declare class ConditionalEvaluator {
    /**
     * Iteratively resolves nested and sibling conditional blocks.
     * Format: [[if condition_expression]] content [[endif]]
     */
    evaluate(template: string, vars: Record<string, any>): string;
    /**
     * Safely parses and evaluates a simple boolean logic expression.
     * Supports variables, '!', '&&', and '||'.
     */
    private evaluateExpression;
}
export declare const conditionalEvaluator: ConditionalEvaluator;
