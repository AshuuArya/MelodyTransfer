
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// --- 1. Error Handling ---

export class AppError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'AppError';
        this.code = code; // e.g., 'AUTH_ERROR', 'RATE_LIMIT'
        this.details = details;
    }
}

export const logError = (error, context = '') => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${context}:`, {
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack,
        details: error.details || error
    });
};

// --- 2. Retry Logic ---

/**
* Retries a function with exponential backoff
* @param {Function} fn - Async function to retry
* @param {number} retries - Max retries
* @param {number} delay - Initial delay in ms
* @returns {Promise<any>}
*/
export const withRetry = async (fn, retries = 3, delayMs = 1000) => { // Rename to delayMs to avoid conflict with delay() func
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;

        // Don't retry on 401/403 (Auth errors) unless specified or if it's a rate limit 429 that explicitly handles wait
        // But typically we want to retry network blips.
        // If error.status === 401, usually we shouldn't retry unless we refresh token... handling that in auth layer.

        console.warn(`Retrying... attempts left: ${retries}. Waiting ${delayMs}ms.`);
        await new Promise(r => setTimeout(r, delayMs));

        return withRetry(fn, retries - 1, delayMs * 2);
    }
};

// --- 3. Rate Limiting ---

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple Token Bucket for Rate Limiting
class RateLimiter {
    constructor(tokensPerInterval, interval) {
        this.tokens = tokensPerInterval;
        this.maxTokens = tokensPerInterval;
        this.interval = interval;
        this.lastRefill = Date.now();
    }

    async getToken() {
        this.refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }

        const waitTime = this.interval; // Simple wait strategy
        // console.log(`Rate limit reached via local limiter. Waiting ${waitTime}ms...`);
        await delay(waitTime);
        this.tokens = this.maxTokens - 1; // Reset after wait
        return true;
    }

    refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        if (timePassed > this.interval) {
            this.tokens = this.maxTokens;
            this.lastRefill = now;
        }
    }
}

// Singleton instances for providers
export const spotifyLimiter = new RateLimiter(10, 1000); // ~10 req/sec
export const youtubeLimiter = new RateLimiter(5, 1000);  // ~5 req/sec (stricter quota)

// --- 4. API Response Validation ---

export const handleApiResponse = async (response, provider) => {
    if (!response.ok) {
        const text = await response.text();
        try {
            errorDetails = JSON.parse(text);
        } catch (e) {
            errorDetails = text || response.statusText;
        }

        // 429 is Rate Limit
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new AppError('Rate limit exceeded', 'RATE_LIMIT', { retryAfter, provider });
        }

        // 401 is Unauthorized
        if (response.status === 401) {
            throw new AppError('Authentication failed', 'AUTH_EXPIRED', { provider });
        }

        // 403 Forbidden (Likely Quota or Permissions)
        if (response.status === 403) {
            const msg = errorDetails?.error?.message || 'Forbidden';
            throw new AppError(`YouTube API Error: ${msg}`, 'API_ERROR_403', errorDetails);
        }

        throw new AppError(`API Error from ${provider} (${response.status}): ${JSON.stringify(errorDetails?.error?.message || errorDetails)}`, `API_ERROR_${response.status}`, errorDetails);
    }

    // Handle empty content like 204
    if (response.status === 204) return null;

    return response.json();
};
