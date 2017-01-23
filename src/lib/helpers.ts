import * as fs from 'fs';
var moment = require('moment');
var path = require('path');

require('moment-timezone');

export function clone(obj) {
	var copy;

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

export function fileExists(filePath: string): boolean {
	try {
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

// Looks into an object for properties that represent time values and inserts
// additional properties that represent the coresponding local time
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
		// excludes network & broacast addresses
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

// Pad a number (or string) up to a given width
// with zeroes, or any other character
export function pad(n: string | number, width, z: string) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
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

export function startsWith(testString: string, searchString: string, position?: number) {
	position = position || 0;
	return testString.substr(position, searchString.length) === searchString;
}

export function writeFile(filePath: string, fileName: string, data: any) {
	if (typeof data !== 'string') {
		data = JSON.stringify(data, null, '\t');
	}

	fs.writeFileSync(path.join(filePath, fileName), data);
}