export interface IExtractor {
    extract(input: any): Promise<any>;
}
