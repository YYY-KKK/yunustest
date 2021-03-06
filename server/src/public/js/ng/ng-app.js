var ngApp = angular.module('ngApp', []);

ngApp.service('helpers', function () {
    /** Utility function for string formating. Usage: format("{0} {1}", "Hello", "world!") */
    this.format = function (text) {
        var args = arguments;

        return text.replace(/\{(\d+)\}/g, function (match, index) {
            var argIndex = Number(index) + 1;
            return typeof args[argIndex] !== 'undefined'
                ? args[argIndex]
                : match;
        });
    };

    this.safeApply = function ($scope, fn) {
        var phase = $scope.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn) {
                $scope.$eval(fn);
            }
        } else {
            if (fn) {
                $scope.$apply(fn);
            } else {
                $scope.$apply();
            }
        }
    };

    /** Implements the saveAs() FileSaver interface in browsers that do not natively support it.
    FileSaver.js - Copyright 2016 Eli Grey, licensed under the MIT License */
    /*eslint-disable */
    this.saveAs = (window && window.saveAs) || function (e) { "use strict"; if (typeof e === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) { return } var t = e.document, n = function () { return e.URL || e.webkitURL || e }, r = t.createElementNS("http://www.w3.org/1999/xhtml", "a"), o = "download" in r, a = function (e) { var t = new MouseEvent("click"); e.dispatchEvent(t) }, i = /constructor/i.test(e.HTMLElement) || e.safari, f = /CriOS\/[\d]+/.test(navigator.userAgent), u = function (t) { (e.setImmediate || e.setTimeout)(function () { throw t }, 0) }, s = "application/octet-stream", d = 1e3 * 40, c = function (e) { var t = function () { if (typeof e === "string") { n().revokeObjectURL(e) } else { e.remove() } }; setTimeout(t, d) }, l = function (e, t, n) { t = [].concat(t); var r = t.length; while (r--) { var o = e["on" + t[r]]; if (typeof o === "function") { try { o.call(e, n || e) } catch (a) { u(a) } } } }, p = function (e) { if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)) { return new Blob([String.fromCharCode(65279), e], { type: e.type }) } return e }, v = function (t, u, d) { if (!d) { t = p(t) } var v = this, w = t.type, m = w === s, y, h = function () { l(v, "writestart progress write writeend".split(" ")) }, S = function () { if ((f || m && i) && e.FileReader) { var r = new FileReader; r.onloadend = function () { var t = f ? r.result : r.result.replace(/^data:[^;]*;/, "data:attachment/file;"); var n = e.open(t, "_blank"); if (!n) e.location.href = t; t = undefined; v.readyState = v.DONE; h() }; r.readAsDataURL(t); v.readyState = v.INIT; return } if (!y) { y = n().createObjectURL(t) } if (m) { e.location.href = y } else { var o = e.open(y, "_blank"); if (!o) { e.location.href = y } } v.readyState = v.DONE; h(); c(y) }; v.readyState = v.INIT; if (o) { y = n().createObjectURL(t); setTimeout(function () { r.href = y; r.download = u; a(r); h(); c(y); v.readyState = v.DONE }); return } S() }, w = v.prototype, m = function (e, t, n) { return new v(e, t || e.name || "download", n) }; if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) { return function (e, t, n) { t = t || e.name || "download"; if (!n) { e = p(e) } return navigator.msSaveOrOpenBlob(e, t) } } w.abort = function () { }; w.readyState = w.INIT = 0; w.WRITING = 1; w.DONE = 2; w.error = w.onwritestart = w.onprogress = w.onwrite = w.onabort = w.onerror = w.onwriteend = null; return m }(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content); if (typeof module !== "undefined" && module.exports) { module.exports.saveAs = saveAs } else if (typeof define !== "undefined" && define !== null && define.amd !== null) { define("FileSaver.js", function () { return saveAs }) };
    /*eslint-enable */

    /** Trim specified characters from the beginning and end of a string */
    this.trimChars = function (text, chars = ' \t\r\n\f') {
        if (!text) {
            return '';
        }

        const escapedChars = escapeRegEx(chars);
        const regex = new RegExp(
            '^[' + escapedChars + ']+|[' + escapedChars + ']+$',
            'g');
        return text.replace(regex, '');
    }

    /** Escape a string so we can safely use it in a regular expression. */
    function escapeRegEx(text) {
        return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
});

ngApp.service('apiAdapter', ['$http', '$q', function ($http, $q) {
    var testSessions = null;
    var self = this;

    /** Return the old session label but append a number at the end. If a
	 * number already exists, increase it by one. */
    this.computeDuplicateSessionLabel = function (oldLabel) {
        if (!oldLabel) return Math.round(Date.now() / 1000).toString();

        oldLabel = oldLabel.trim();

        if (!testSessions) {
            return oldLabel;
        }

        var baseName;
        var lastNumber;
        var nextLabel;

        var matchNumberedSession = oldLabel.match(/(.+)\s+(\d{1,3})\s*$/);
        if (matchNumberedSession) {
            baseName = matchNumberedSession[1];
            lastNumber = parseInt(matchNumberedSession[2]) || 1;
            nextLabel = matchNumberedSession[1] + ' ' + (lastNumber + 1);
        } else {
            nextLabel = oldLabel.trim() + ' 2';
        }


        var existingSessionIndex = testSessions.find(function (session) { return session.label === nextLabel; });
        if (existingSessionIndex) {
            return self.computeDuplicateSessionLabel(nextLabel);
        } else {
            return nextLabel;
        }
    };


    this.getSession = function (sessionId) {
        return $q(function (resolve, reject) {
            if (!sessionId) {
                resolve(null);
                return;
            }

            try {
                $http.get('/api/session/' + sessionId)
                    .then(
                        function success(res) {
                            resolve(res.data);
                        },
                        function error(err) {
                            reject(err);
                        });
            } catch (err) {
                reject(err);
            }
        });
    };

    /** Returns the cached array of test sessions. */
    this.getSessions = function () {
        return testSessions;
    };

    /** Refreshes the test session data by making an API call to the sync
     * service and returns a promise that resolves to the sessions array. */
    this.refreshSessions = function () {
        return $q(function (resolve, reject) {
            try {
                $http.get('/api/sessions?tests=false')
                    .then(
                        function success(res) {
                            testSessions = res.data;
                            resolve(res.data);
                        },
                        function error(err) {
                            reject(err);
                        });
            } catch (err) {
                reject(err);
            }
        });
    };
}]);