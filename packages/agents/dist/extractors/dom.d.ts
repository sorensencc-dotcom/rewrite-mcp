import type { CrawlResult } from '../crawler/index.js';
export interface DomNode {
    tag: string;
    id?: string;
    classes: string[];
    attributes: Record<string, string>;
    children: DomNode[];
    text?: string;
}
export interface DomModel {
    url: string;
    title: string;
    meta: {
        description?: string;
        viewport?: string;
        charset?: string;
    };
    root: DomNode;
    headings: {
        tag: string;
        text: string;
    }[];
    images: {
        src: string;
        alt?: string;
    }[];
    links: {
        href: string;
        text: string;
    }[];
    forms: {
        id?: string;
        action?: string;
        method?: string;
        fields: number;
    }[];
    extractedAt: string;
}
export interface ExtractorOptions {
    maxDepth?: number;
    captureImages?: boolean;
    captureLinks?: boolean;
    captureForms?: boolean;
}
export declare class DomExtractor {
    private readonly maxDepth;
    private readonly captureImages;
    private readonly captureLinks;
    private readonly captureForms;
    constructor(options?: ExtractorOptions);
    /**
     * Extract DOM model from crawl result HTML.
     * Returns parsed DOM tree, metadata, and extracted elements.
     */
    extract(crawl: CrawlResult): DomModel | null;
    private buildDomTree;
    private captureAttributes;
    private extractHeadings;
    private extractImages;
    private extractLinks;
    private extractForms;
}
