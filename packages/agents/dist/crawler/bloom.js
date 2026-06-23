/**
 * In-memory Bloom filter for URL deduplication.
 * 8M-bit array + 7 hash functions → false-positive rate ~0.008% at 10k entries.
 */
export class BloomFilter {
    constructor(size = 8000000, hashCount = 7) {
        this.size = size;
        this.hashCount = hashCount;
        this.bits = new Uint8Array(Math.ceil(size / 8));
    }
    hash(value, seed) {
        let h = seed >>> 0;
        for (let i = 0; i < value.length; i++) {
            h = Math.imul(h ^ value.charCodeAt(i), 0x9e3779b9) >>> 0;
            h = (h ^ (h >>> 16)) >>> 0;
        }
        return h % this.size;
    }
    add(value) {
        for (let i = 0; i < this.hashCount; i++) {
            const idx = this.hash(value, (i + 1) * 0x517cc1b7);
            this.bits[idx >> 3] |= 1 << (idx & 7);
        }
    }
    has(value) {
        for (let i = 0; i < this.hashCount; i++) {
            const idx = this.hash(value, (i + 1) * 0x517cc1b7);
            if (!(this.bits[idx >> 3] & (1 << (idx & 7))))
                return false;
        }
        return true;
    }
}
