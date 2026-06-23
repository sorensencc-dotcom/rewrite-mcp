"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReasoningTrace = exports.VerdictSynthesizer = void 0;
exports.runArl = runArl;
const ReasoningTraceFormatter_1 = require("./engine/ReasoningTraceFormatter");
const VerdictSynthesizer_1 = require("./engine/VerdictSynthesizer");
async function runArl(input) {
    const trace = (0, ReasoningTraceFormatter_1.formatReasoningTrace)(input.coherence, input.semantic, input.temporal, input.causal, input.narrative, input.composite, input.confidence, input.drift);
    const synthesizer = new VerdictSynthesizer_1.VerdictSynthesizer();
    const verdict = synthesizer.synthesize(`Evaluated ${input.composite.details}`, input.confidence.score, trace);
    return verdict;
}
var VerdictSynthesizer_2 = require("./engine/VerdictSynthesizer");
Object.defineProperty(exports, "VerdictSynthesizer", { enumerable: true, get: function () { return VerdictSynthesizer_2.VerdictSynthesizer; } });
var ReasoningTraceFormatter_2 = require("./engine/ReasoningTraceFormatter");
Object.defineProperty(exports, "formatReasoningTrace", { enumerable: true, get: function () { return ReasoningTraceFormatter_2.formatReasoningTrace; } });
__exportStar(require("./contracts/index"), exports);
//# sourceMappingURL=index.js.map