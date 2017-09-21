package dtest.base.http;

public enum HttpVerb {
	GET,
        HEAD,
        PATCH,
        POST,
        PUT,
        DELETE,
        /** Will actually use DELETE verb, but also allow a payload to be sent.
         * This is to work around the Apache HTTP client removing the payload
         * for DELETE requests. */
        DELETE_WITH_BODY,
        OPTIONS
}
