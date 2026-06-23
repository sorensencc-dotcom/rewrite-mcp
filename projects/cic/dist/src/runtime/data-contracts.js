export function validateIngestionJob(job) {
    if (!job || typeof job !== "object")
        return { ok: false };
    if (!job.job_id || !job.type || !job.source)
        return { ok: false };
    return { ok: true };
}
export function validateVectorPayload(payload) {
    if (!payload || typeof payload !== "object")
        return { ok: false };
    if (!payload.id || !payload.vector || !payload.payload)
        return { ok: false };
    if (!Array.isArray(payload.vector) || payload.vector.length === 0)
        return { ok: false };
    return { ok: true };
}
//# sourceMappingURL=data-contracts.js.map