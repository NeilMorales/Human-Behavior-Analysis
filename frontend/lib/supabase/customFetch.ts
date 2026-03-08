// Custom fetch with timeout, retry logic, and circuit breaker
const TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000; // 60 seconds

// Circuit breaker state
let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;

export async function customFetch(
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    // Check circuit breaker
    if (Date.now() < circuitBreakerOpenUntil) {
        throw new Error('Circuit breaker is open - too many consecutive failures');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            // Merge abort signal with existing signal if any
            const signal = init?.signal 
                ? AbortSignal.any([init.signal, controller.signal])
                : controller.signal;

            const response = await fetch(input, {
                ...init,
                signal,
            });

            clearTimeout(timeoutId);

            // Reset circuit breaker on success
            consecutiveFailures = 0;

            return response;
        } catch (error: any) {
            lastError = error;

            // Don't retry on abort (user cancelled)
            if (error.name === 'AbortError' && init?.signal?.aborted) {
                throw error;
            }

            // Log the error
            console.error(`Fetch attempt ${attempt + 1} failed:`, error.message);

            // If this is the last attempt, don't wait
            if (attempt < MAX_RETRIES - 1) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
            }
        }
    }

    // All retries failed - increment circuit breaker counter
    consecutiveFailures++;

    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
        console.error('Circuit breaker opened - too many consecutive failures');
    }

    throw lastError || new Error('Fetch failed after all retries');
}
