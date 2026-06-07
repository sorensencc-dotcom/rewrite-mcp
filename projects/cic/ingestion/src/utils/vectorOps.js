/**
 * vectorOps.js - Vector operations utilities
 * @version 1.0.0
 * @date 2026-05-30
 *
 * Provides mathematical operations for vector similarity, embeddings, and distance metrics
 */

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity score (0-1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  if (vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Compute Euclidean distance between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Euclidean distance
 */
export function euclideanDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return Infinity;
  }

  if (vecA.length !== vecB.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Compute Manhattan distance between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Manhattan distance
 */
export function manhattanDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return Infinity;
  }

  if (vecA.length !== vecB.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += Math.abs(vecA[i] - vecB[i]);
  }

  return sum;
}

/**
 * Compute vector magnitude
 * @param {number[]} vec - Input vector
 * @returns {number} Magnitude (L2 norm)
 */
export function magnitude(vec) {
  if (!vec || vec.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const val of vec) {
    sum += val * val;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 * @param {number[]} vec - Input vector
 * @returns {number[]} Normalized vector
 */
export function normalize(vec) {
  if (!vec || vec.length === 0) {
    return [];
  }

  const mag = magnitude(vec);
  if (mag === 0) {
    return vec.map(() => 0);
  }

  return vec.map((v) => v / mag);
}

/**
 * Compute variance of a vector
 * @param {number[]} vec - Input vector
 * @returns {number} Variance
 */
export function variance(vec) {
  if (!vec || vec.length === 0) {
    return 0;
  }

  const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
  const squaredDiffs = vec.map((v) => (v - mean) * (v - mean));
  return squaredDiffs.reduce((a, b) => a + b, 0) / vec.length;
}

/**
 * Compute standard deviation of a vector
 * @param {number[]} vec - Input vector
 * @returns {number} Standard deviation
 */
export function standardDeviation(vec) {
  return Math.sqrt(variance(vec));
}

export default {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  magnitude,
  normalize,
  variance,
  standardDeviation,
};
