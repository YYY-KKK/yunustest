export let error = {
    /** No tests were found that match the provided criteria. */
    NO_MATCHING_TESTS: 'no-matching-tests'
}

export let testSessionStatus = {
    ACQUIRING_ACTORS: 'acquiring-actors',
    COMPLETED: 'completed',
    STARTED: 'started'
};

export let testSessionResult = {
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    PASSED: 'passed',
    PENDING: 'pending'
};

export let segmentStatus = {
    COMPLETED: 'completed',
    PENDING: 'pending',
    STARTED: 'started'
};

export let segmentResult = {
    FAILED: 'failed',
    PASSED: 'passed',
    PENDING: 'pending',
    SKIPPED: 'skipped'
};

export let testStatus = {
    COMPLETED: 'completed',
    PENDING: 'pending',
    STARTED: 'started'
};

export let testResult = {
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    PASSED: 'passed',
    PENDING: 'pending',
    SKIPPED: 'skipped'
};

export let actionResult = {
    FAILED: 'failed',
    PASSED: 'passed',
    SKIPPED: 'skipped'
};