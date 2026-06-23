"use strict";
/**
 * projects/cic/src/pms/v2/conditional.ts
 * Conditional block evaluator supporting standard boolean syntax.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionalEvaluator = exports.ConditionalEvaluator = void 0;
const errors_js_1 = require("./errors.js");
class ConditionalEvaluator {
    /**
     * Iteratively resolves nested and sibling conditional blocks.
     * Format: [[if condition_expression]] content [[endif]]
     */
    evaluate(template, vars) {
        let result = template;
        // Innermost conditional regex to avoid greedy outer capture of nested conditions.
        // Matches: [[if expression]] content [[endif]] where content has no nested if/endif tags.
        const innerRegex = /\[\[if\s+([a-zA-Z0-9_!\s&|()]+?)\]\]((?:(?!\[\[if|\[\[endif\]\])[\s\S])*?)\[\[endif\]\]/g;
        let iterations = 0;
        const maxIterations = 100; // Safeguard against infinite loops
        while (innerRegex.test(result)) {
            if (iterations++ > maxIterations) {
                throw new errors_js_1.ConditionalEvaluationError("Excessive nesting or malformed conditional loop detected");
            }
            // Reset regex index and run replacement pass
            innerRegex.lastIndex = 0;
            result = result.replace(innerRegex, (match, condExpr, content) => {
                try {
                    const isTrue = this.evaluateExpression(condExpr.trim(), vars);
                    return isTrue ? content : "";
                }
                catch (err) {
                    throw new errors_js_1.ConditionalEvaluationError(`Failed to evaluate condition expression '${condExpr}': ${err.message}`);
                }
            });
        }
        return result;
    }
    /**
     * Safely parses and evaluates a simple boolean logic expression.
     * Supports variables, '!', '&&', and '||'.
     */
    evaluateExpression(expr, vars) {
        if (!expr) {
            return false;
        }
        // Split by OR ('||') operator
        const orParts = expr.split("||");
        for (const orPart of orParts) {
            // Split by AND ('&&') operator
            const andParts = orPart.split("&&");
            let andOutcome = true;
            for (const andPart of andParts) {
                let part = andPart.trim();
                // Remove enclosing parentheses if present
                if (part.startsWith("(") && part.endsWith(")")) {
                    part = part.slice(1, -1).trim();
                }
                let negate = false;
                if (part.startsWith("!")) {
                    negate = true;
                    part = part.slice(1).trim();
                }
                const value = vars[part];
                const truthy = !!value && value !== "false";
                const partOutcome = negate ? !truthy : truthy;
                if (!partOutcome) {
                    andOutcome = false;
                    break; // Short circuit AND evaluation
                }
            }
            if (andOutcome) {
                return true; // Short circuit OR evaluation
            }
        }
        return false;
    }
}
exports.ConditionalEvaluator = ConditionalEvaluator;
exports.conditionalEvaluator = new ConditionalEvaluator();
//# sourceMappingURL=conditional.js.map