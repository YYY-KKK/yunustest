package dtest.base.exceptions;

/**
 * Thrown to indicate a required parameter is missing from configuration
 */
public class ParameterNotFoundException extends RuntimeException {
    public ParameterNotFoundException(String message) {
        super(message);
    }
}
