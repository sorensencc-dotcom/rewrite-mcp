export declare function loadRuntimeContract(): {
    path: string;
    raw: string;
    version: string | null;
    sections: string[];
};
export declare function requireContractVersion(expected: string): {
    path: string;
    raw: string;
    version: string | null;
    sections: string[];
};
declare const _default: {
    loadRuntimeContract: typeof loadRuntimeContract;
    requireContractVersion: typeof requireContractVersion;
};
export default _default;
//# sourceMappingURL=contract-loader.d.ts.map