/**
 * In-memory Bloom filter for URL deduplication.
 * 8M-bit array + 7 hash functions → false-positive rate ~0.008% at 10k entries.
 */
export declare class BloomFilter {
    private readonly bits;
    private readonly size;
    private readonly hashCount;
    constructor(size?: number, hashCount?: number);
    private hash;
    add(value: string): void;
    has(value: string): boolean;
}
