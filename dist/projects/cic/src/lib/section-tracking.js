"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceSection = advanceSection;
exports.readSectionState = readSectionState;
const VALID_SECTIONS = ["0.1-A", "0.2", "0.3", "0.4"];
function advanceSection(section, state) {
    if (!VALID_SECTIONS.includes(section)) {
        throw new Error(`Unknown section: ${section}`);
    }
    if (state[section] === "COMPLETE") {
        throw new Error(`Section ${section} is already COMPLETE (backward transition or regression not allowed)`);
    }
    const newState = { ...state };
    newState[section] = "COMPLETE";
    return newState;
}
function readSectionState() {
    return { "0.1-A": "COMPLETE" };
}
//# sourceMappingURL=section-tracking.js.map