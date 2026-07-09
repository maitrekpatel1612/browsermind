/**
 * Retry using exponential backoff strategy (https://medium.com/@someshrangrej/understanding-exponential-backoff-a-smart-retry-mechanism-0de0a7a8ce6f)
 */

export interface RetryOptions {
    attempts? : number; // Number of attempts to retry the function (default: 3)
    baseDelay? : number; // Base delay in milliseconds (default: 500)
    maxDelay? : number; // Maximum delay in milliseconds (default: 5000)
    shouldRetry? : (error : unknown) => boolean; // Function to determine if the error is retryable (default: always true)
}

export async function withRetry<T>(
    fn: () => Promise<T>, options: RetryOptions = {}) : Promise<T> {
    const {
        attempts = 3,
        baseDelay = 500,
        maxDelay = 5000,
        shouldRetry = () => true
    } = options;

    let lastError : unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
        try 
        {
            return await fn();
        } catch (error) 
        {
            lastError = error as Error;
            if(shouldRetry && !shouldRetry(lastError)) throw error;
            if(attempt === attempts - 1) break; // If it's the last attempt, break the loop

            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.floor(Math.random() * 200); // Add some randomness to avoid thundering herd problem
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
    }

    throw lastError;
}