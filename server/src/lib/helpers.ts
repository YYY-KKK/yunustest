import * as csvParse from 'csv-parse';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';
import * as thenify from 'thenify';

require('moment-timezone');

/** Add the specified extension to a file name, if it doesn't have
 * it already, and return the new file name. */
export function addExtension(fileName: string, extension: string): string {
	extension = trimChars(extension, '.');

	const currentExtension = trimChars(path.extname(fileName), '.');
	if (currentExtension != extension) {
		return fileName + '.' + extension;
	} else {
		return fileName;
	}

}

export function clone(obj) {
	let copy;

	// Handle the 3 simple types, and null or undefined
	if (null == obj || 'object' != typeof obj) return obj;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			copy[i] = clone(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
		}
		return copy;
	}

	throw new Error('Unable to copy object. The object type is not supported.');
}

export function deleteDirRecursive(path) {
	try {
		if (fs.existsSync(path)) {
			fs.readdirSync(path).forEach(function (file, index) {
				var fullPath = path + "/" + file;
				if (fs.lstatSync(fullPath).isDirectory()) {
					deleteDirRecursive(fullPath);
				} else {
					fs.unlinkSync(fullPath);
				}
			});
			fs.rmdirSync(path);
		}
	} catch (err) {
		// Swallowing the exception is fine here
	}
}

export function directoryExists(dirPath: string): boolean {
	try {
		return fs.statSync(dirPath).isDirectory();
	} catch (err) {
		return false;
	}
}

export function deleteFile(path) {
	try {
		if (fs.existsSync(path)) {
			fs.unlinkSync(path);
		}
	} catch (err) {
		// Swallowing the exception is fine here
	}
}

export function endsWith(testString: string, searchString: string, position?: number) {
	var subjectString = testString.toString();
	if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
		position = subjectString.length;
	}

	position -= searchString.length;
	var lastIndex = subjectString.indexOf(searchString, position);
	return lastIndex !== -1 && lastIndex === position;
}

/** If the argument is an object value, it recursively renames the
 * properties whose names start with the "$" sign by replacing "$" with
 * "d$", in order to avoid errors when inserting this data in MongoDB-
 * compatible databases */
export function escape$Properties(obj) {
	if (obj && typeof obj === 'object') {
		Object.keys(obj).forEach((propName) => {
			if (obj[propName] && typeof obj[propName] === 'object') {
				obj[propName] = escape$Properties(obj[propName]);
			}

			if (propName.startsWith('$')) {
				obj['d' + propName] = obj[propName];
				delete obj[propName];
			}
		});
	}

	return obj;
}

/** Escape a string so we can safely use it in a regular expression. */
export function escapeRegEx(text: string): string {
	return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function fileExists(filePath: string): boolean {
	try {
		if (!filePath) {
			return false;
		}

		return fs.statSync(filePath).isFile();
	} catch (err) {
		return false;
	}
}

/** Utility function for string formatting.
 * Example: format("{0}, {1}!", "Hello", "world") // "Hello, world!"
 */
export function format(text: string, ...any) {
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

/** Convert a file size from bytes to a human-readable value. */
export function humanFileSize(size) {
	var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
	return Number((size / Math.pow(1024, i)).toFixed(2)) + ['B', 'K', 'M', 'G', 'T'][i];
};

// Looks into an object for properties that represent time values and inserts
// additional properties that represent the corresponding local time
export function insertLocalTimes(obj, timezone, propertyNames) {
	if (!propertyNames) {
		Object.keys(obj).forEach(function (key) {
			if ((startsWith(key, 'time') || endsWith(key, 'Time')) && typeof obj[key] === 'number' && obj[key] > 21600000) {
				insertLocalTime(obj, timezone, key);
			}
		});
	} else {
		propertyNames.forEach(function (propertyName) {
			insertLocalTime(obj, timezone, propertyName);
		});
	}

	function insertLocalTime(obj, timezone, propertyName) {
		obj[propertyName + 'Local'] = moment.tz(obj[propertyName], timezone).valueOf();
	}
}

export function isValidUrl(str: string) {
	var urlRegexp = new RegExp(
		"^" +
		// protocol identifier
		"(?:(?:https?|ftp)://)" +
		// user:pass authentication
		"(?:\\S+(?::\\S*)?@)?" +
		"(?:" +
		// IP address exclusion
		// private & local networks
		"(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
		"(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
		"(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
		// IP address dotted notation octets
		// excludes loopback network 0.0.0.0
		// excludes reserved space >= 224.0.0.0
		// excludes network & broadcast addresses
		// (first & last IP address of each class)
		"(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
		"(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
		"(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
		"|" +
		// host name
		"(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
		// domain name
		"(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
		// TLD identifier
		"(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
		// TLD may end with dot
		"\\.?" +
		")" +
		// port number
		"(?::\\d{2,5})?" +
		// resource path
		"(?:[/?#]\\S*)?" +
		"$", "i");

	return urlRegexp.test(str);
}

/** Pad left a number (or string) with zeroes, or any other character,
 * up to the specified width */
export function padLeft(value: string | number, width, character: string = ' '): string {
	character = character || ' ';
	value = value.toString();
	return value.length >= width ?
		value :
		new Array(width - value.length + 1).join(character) + value;
}

/** Pad right a number (or string) with zeroes, or any other character,
 * up to the specified width */
export function padRight(value: string | number, width, character: string = ' '): string {
	character = character || ' ';
	value = value.toString();
	return value.length >= width ?
		value :
		value + new Array(width - value.length + 1).join(character);
}

export function parseBool(value: any): boolean {
	value = value.toString().trim().toUpperCase();
	var result;

	switch (value) {
		case 'TRUE': result = true; break;
		case 'FALSE': result = false; break;
		case '1': result = true; break;
		case '0': result = false; break;
		case 'YES': result = true; break;
		case 'NO': result = false; break;
		default: throw new Error('Failed to convert value "' + value + '" to a boolean.');
	}

	return result;
}

export async function parseCsvFile(csvFile: string, options?: any) {
	options = options || {};
	options.columns = options.columns || true;
	options.encoding = options.encoding || 'utf8';

	const csvData = await thenify(fs.readFile)(csvFile, options.encoding);
	const csvParseOptions = {
		columns: options.columns
	};

	const csvRecords = await new Promise(async function (resolve, reject) {
		try {
			const parser = csvParse(
				csvParseOptions,
				function (err, records) {
					if (err) {
						return reject(err);
					} else {
						resolve(records);
					}
				})
			parser.write(csvData)
			parser.end()
		} catch (err) {
			reject(err);
		}
	});
	
	return csvRecords;
}

/** Determine if a path (file of directory) is a child of another. */
export function pathIsChildOf(parent: string, child: string): boolean {
	const relative = path.relative(parent, child);
	return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function startsWith(testString: string, searchString: string, position?: number) {
	position = position || 0;
	return testString.substr(position, searchString.length) === searchString;
}

/** Trim specified characters from the beginning and end of a string */
export function trimChars(text: string, chars: string = ' \t\r\n\f'): string {
	if (!text) {
		return '';
	}

	const escapedChars = escapeRegEx(chars);
	const regex = new RegExp(
		format('^[{0}]+|[{0}]+$', escapedChars),
		'g');
	return text.replace(regex, '');
}

/** Trim specified characters from the beginning of a string */
export function trimLeft(text: string, chars: string = ' \t\r\n\f'): string {
	const escapedChars = escapeRegEx(chars);
	const regex = new RegExp(
		format('^[{0}]+', escapedChars),
		'g');
	return text.replace(regex, '');
}

/** Trim specified characters from the end of a string */
export function trimRight(text: string, chars: string = ' \t\r\n\f'): string {
	const escapedChars = escapeRegEx(chars);
	const regex = new RegExp(
		format('[{0}]+$', escapedChars),
		'g');
	return text.replace(regex, '');
}

export function writeFile(filePath: string, fileName: string, data: any) {
	if (typeof data !== 'string') {
		data = JSON.stringify(data, null, '\t');
	}

	fs.writeFileSync(path.join(filePath, fileName), data);
}