import { ForemanManifest } from './types.js';
export interface LoaderOptions {
    basePath?: string;
    strict?: boolean;
}
export declare class ForemanLoader {
    private basePath;
    private strict;
    constructor(options?: LoaderOptions);
    load(manifestPath: string): Promise<ForemanManifest>;
    private validate;
}
