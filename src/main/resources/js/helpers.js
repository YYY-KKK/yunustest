/**
 * This file is loaded automatically in the JS interpreter that the test actor
 * uses to evaluate action arguments, all the functions declared here will be
 * available to call in test definitions.
 */

var $global = this;

/** Utility function for string formatting.
 * Example: format("{0}, {1}!", "Hello", "world") // "Hello, world!"
 */
function $format(text) {
    var args = arguments;
    var arg;
    var argIndex;

    return text.replace(
        /\{(\d+)\}/g,
        function (match, index) {
            argIndex = Number(index) + 1;
            arg = args[argIndex];
            switch (typeof arg) {
                case 'number':
                case 'string': return args[argIndex];
                case 'object': return JSON.stringify(args[argIndex]);
                case 'undefined': return match;
                default: return args[argIndex];
            }
        });
}