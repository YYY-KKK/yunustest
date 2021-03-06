/**
 * This file is loaded automatically in the JS interpreter that the test actor
 * uses to evaluate action arguments, all the functions declared here will be
 * available to call in test definitions.
 */

var $global = this;

/**
 * Utility function for string formatting.
 * Usage:
 *     format("{0}, {1}!", "Hello", "world") // "Hello, world!"
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

/**
 * Returns a random integer number between min and max.
 * Usage:
 *     $randomInt(1, 100); // 87
 */
function $randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

var $random = $randomInt;

/**
 * Returns a random string with the specified length by randomly
 * selecting characters from the pool provided. If the character
 * pool is not provided, the default pool will contain all numbers
 * and letters (both uppercase and lowercase).
 * Usage:
 *     $randomString(5); // 2U8cA
 *     $randomString(5, "ABC123"); // AB2AC
 */
function $randomString(length, characterPool)
{
    if (typeof characterPool !== 'string') {
        characterPool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    }
    
    var text = "";
    for (var i = 0; i < length; i++) {
        text += characterPool.charAt(Math.floor(Math.random() * characterPool.length));
    }

    return text;
}

/**
 * Create and return an array of integers.
 * Usage:
 *     $range(5, 3); // [5,6,7]
 *     $range(5);    // [0,1,2,3,4]
 */
function $range(start, length) {
    if (arguments.length === 1) {
        length = arguments[0];
        start = 0;
    }
    return Array.apply(null, Array(length)).map(function (_, index) {
        return index + start;
    });
}