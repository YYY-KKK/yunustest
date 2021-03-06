/** Utility function for string formatting.
 * Example: format("{0}, {1}!", "Hello", "world") // "Hello, world!"
 */
exports.format = function(text) {
	const args = arguments;
	let arg;
	let argIndex;

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

/** Output text at the console in a distinctive way, as a means to mark
 * the start of a new section in the log and improve readability  */
exports.logTitle = function(text) {
    const width = 80;
    console.log('\n' + '='.repeat(width));
    console.log('' + text + ' '.repeat(width - text.length - 8) + ' ');
    console.log('='.repeat(width));
}