package dtest.base.exceptions;

/**
 * Thrown when a script calls the $fail function to fail a test.
 */
public class TestFailException extends RuntimeException {
    public TestFailException(String message) {
        super(message);
    }
}
