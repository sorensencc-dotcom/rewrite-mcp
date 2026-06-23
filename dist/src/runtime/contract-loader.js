"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRuntimeContract = loadRuntimeContract;
exports.requireContractVersion = requireContractVersion;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONTRACT_PATHS = [
    path_1.default.resolve(process.cwd(), "projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md"),
    path_1.default.resolve(__dirname, "../../projects/cic/docs/CIC_AI_RUNTIME_CONTRACT.md")
];
function findContractPath() {
    for (const p of CONTRACT_PATHS) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return null;
}
function readContractRaw() {
    const p = findContractPath();
    if (!p)
        throw new Error("CIC_AI_RUNTIME_CONTRACT.md not found in expected locations");
    return fs_1.default.readFileSync(p, "utf8");
}
function extractVersion(md) {
    const m = md.match(/^\s*\*\*Version:\*\*\s*([0-9]+\.[0-9]+\.[0-9]+)/mi);
    if (m)
        return m[1];
    const m2 = md.match(/^Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/mi);
    return m2 ? m2[1] : null;
}
function extractTopSections(md) {
    const lines = md.split(/\r?\n/);
    const sections = [];
    for (const l of lines) {
        const m = l.match(/^\s*##+\s+(.*)/);
        if (m)
            sections.push(m[1].trim());
    }
    return sections;
}
function loadRuntimeContract() {
    const p = findContractPath();
    if (!p)
        throw new Error("CIC_AI_RUNTIME_CONTRACT.md not found");
    const raw = fs_1.default.readFileSync(p, "utf8");
    const version = extractVersion(raw);
    const sections = extractTopSections(raw);
    return { path: p, raw, version, sections };
}
function requireContractVersion(expected) {
    const c = loadRuntimeContract();
    if (!c.version) {
        throw new Error(`Runtime contract at ${c.path} has no parsable version`);
    }
    if (c.version !== expected) {
        throw new Error(`Runtime contract version mismatch: expected ${expected}, found ${c.version}`);
    }
    return c;
}
exports.default = { loadRuntimeContract, requireContractVersion };
//# sourceMappingURL=contract-loader.js.map