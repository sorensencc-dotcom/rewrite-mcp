export type EditOpType = "ColorChange" | "LayoutShift" | "TypographyUpdate" | "InsertNode" | "DeleteNode" | "ReplaceNode";
export interface EditOp {
    id: string;
    type: EditOpType;
    selector: string;
    value?: string;
    attributes?: Record<string, string>;
    cssVar?: string;
    htmlSnippet?: string;
}
export interface DomPatchResult {
    html: string;
    cssVars: Record<string, string>;
    rawPatch: string;
    changedSelectors: string[];
}
export declare function applyDomPatch(html: string, cssVars: Record<string, string>, ops: EditOp[]): DomPatchResult;
