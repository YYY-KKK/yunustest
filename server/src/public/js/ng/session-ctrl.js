ngApp.controller('SessionCtrl', ['$scope', '$http', '$window', 'helpers', '$timeout', 'apiAdapter', function ($scope, $http, $window, helpers, $timeout, apiAdapter) {
	var sessionId = $window.sessionId;

	$scope.Math = window.Math;
	$scope.vm = {
		cancelSession: cancelSession,
		getActiveTab: getActiveTab,
		goToTest: goToTest,
		init: init,
		isLoadingLogEntries: false,
		isLoadingSessionInfo: false,
		loadSessionSettingsDefaults: loadSessionSettingsDefaults,
		logEntries: [],
		Math: window.Math,
		moment: moment,
		saveTestResultsAsCsv: saveTestResultsAsCsv,
		session: null,
		sessionSettings: {
			logLevel: null
		},
		sessionSettingsChanged: sessionSettingsChanged,
		showingPartialLog: false,
		toggleTestDetails: toggleTestDetails
	};

	init(sessionId);

	function init(sessionId) {
		// We make sure the session information is populated in the API adapter
		// service, mostly so that we can properly calculate a unique session
		// label when duplicating the session from the "Options" tab.
		apiAdapter.refreshSessions();

		// Load session settings from cookie (or from defaults)
		var sessionSettingsCookie = Cookies.get('sessionSettings');
		if (!sessionSettingsCookie) {
			loadSessionSettingsDefaults();
		} else {
			try {
				$scope.vm.sessionSettings = JSON.parse(sessionSettingsCookie);
			} catch (err) {
				loadSessionSettingsDefaults();
			}
		}

		$scope.vm.isLoadingSessionInfo = true;
		refreshSession($window.sessionId)
			.then(function () {
				refreshSessionLog($window.sessionId);
			});

		$('.nav-tabs a').on('shown.bs.tab', function (e) {
			try {
				$timeout(function () {
					$scope.$apply();
				});
			} catch (err) { }
		});

		if (window.io) {
			var socketOfSessionStatus = io('/session-status', { reconnection: true });
			socketOfSessionStatus.on('status-changed', function (data) {
				if (data.sessionId == $window.sessionId) {
					if ((data.newStatus != $scope.vm.session.status) || (data.newStatus === 'completed')) {
						refreshSession($window.sessionId);
					}
				}
			});
			socketOfSessionStatus.on('progress', function (data) {
				if (data.sessionId == $window.sessionId) {
					if ((data.newStatus != $scope.vm.session.status) || (data.newStatus === 'completed')) {
						refreshSession($window.sessionId);
					}
				}
			});
			setInterval(function () {
				if (!socketOfSessionStatus.connected) {
					socketOfSessionStatus.connect();
				}
			}, 5000);
		}
	}

	function cancelSession(sessionId) {
		$http.delete('/api/session/' + sessionId)
			.then(
				function success(res) {
					refreshSession(sessionId);
				},
				function error(res) {
					console.log(res.data);
				});
	}

	function getActiveTab() {
		return $('div:visible.tab-pane').first().attr('id');
	}

	function goToTest(test, $event) {
		if ($event) {
			$event.stopPropagation();
			$event.preventDefault();
		}
		$('.nav-tabs a[href="#log"]').tab('show');

		var testPath = test.path.trim() ? test.path + "/" : "";

		var testSelector = "#log td:contains(': " + testPath + test.name + "')";
		var testElement = $(testSelector).first();

		if (!testElement.length) {
			// This is the locator string from before changing the logging
			// to include the test name in the test separator log lines. We'll
			// remove it once we're sure nobody uses old test actors anymore.
			testSelector = "#log td:contains('" + test.name + "')";
			testElement = $(testSelector).first();
		}

		if (testElement.length) {
			$('html, body').animate({
				scrollTop: testElement.offset().top - 50
			}, 1000);
		}
	}

	/** Insert data-driven iterations into the tests array, so they can
	 * be displayed in the UI just like regular tests. */
	function insertSubtests(session) {
		for (var testIndex = session.tests.length - 1; testIndex >= 0; --testIndex) {
			var currentTest = session.tests[testIndex];
			if (currentTest.isDataDriven && currentTest.subtests) {
				var subtests = currentTest.subtests.map(function (subtest) {
					subtest.isSubtest = true;
					subtest.name = helpers.format("{0} [{1}]",
						currentTest.name,
						subtest.currentDataRecordIndex + 1);
					subtest.path = currentTest.path;
					return subtest;
				});

				// Remove current data-driven test from the tests array and
				// add the data-driven iterations in its place
				Array.prototype.splice.apply(
					session.tests,
					[testIndex, 1].concat(subtests));
			}
		}
	}

	function loadSessionSettingsDefaults() {
		$scope.vm.sessionSettings = {
			logLevel: "trace"
		};
		sessionSettingsChanged();
	}

	function saveTestResultsAsCsv() {
		var header = 'Test name,Test path,Iterations,Duration,Result\n';

		var testResults = $scope.vm.session.tests.map(function (t) {
			return helpers.format('{0},{1},{2},{3},{4}',
				t.name,
				t.path,
				t.currentIteration || 'N/A',
				t.timeCompleted ? Math.round((t.timeCompleted - t.timeStarted) / 1000) + ' sec' : 'N/A',
				t.result || 'pending');
		}).join('\n');
		if ($scope.vm.session) {
			var csvBaseFilename = $scope.vm.session.label.replace(/[^a-z0-9]/gi, '-');
			helpers.saveAs(new Blob([header + testResults]), helpers.format("{0}.csv", csvBaseFilename));
		}
	}

	function sessionSettingsChanged() {
		Cookies.set('sessionSettings', JSON.stringify($scope.vm.sessionSettings));
		refreshView();
	}

	function refreshSessionLog(sessionId) {
		return $http.get('/api/session/' + sessionId + '/log?format=json')
			.then(
				function success(res) {
					$scope.vm.logEntries = res.data;
					$scope.vm.showingPartialLog =
						res.headers('X-OpenTest-Partial-Data') == 'true';
					$timeout(function () {
						$scope.$apply();
						refreshView();
					});
				},
				function error(err) {
					console.log(err);
				})
			.then(function () {
				$scope.vm.isLoadingLogEntries = false;
			});
	}

	function refreshSession(sessionId) {
		return $http.get('/api/session/' + sessionId)
			.then(
				function success(res) {
					$scope.vm.session = res.data;
					insertSubtests($scope.vm.session);
					refreshView();
				},
				function error(res) {
					console.log(res.data);
				})
			.then(function () {
				$scope.vm.isLoadingSessionInfo = false;
			});
	}

	function refreshView() {
		// Filter log entries
		var prefix = null;
		switch ($scope.vm.sessionSettings.logLevel) {
			case 'info':
				$('table.log tr td:contains("TRACE:")').parent('tr').hide();
				$('table.log tr td:contains("DEBUG:")').parent('tr').hide();
				break;
			case 'debug':
				$('table.log tr td:contains("TRACE:")').parent('tr').hide();
				$('table.log tr td:contains("DEBUG:")').parent('tr').show();
				break;
			case 'trace':
				$('table.log tr').show();
				break;
			default:
				console.log('WARNING: Unknown log level ' + $scope.vm.sessionSettings.logLevel);
				$('table.log tr').show();
		}

	}

	function toggleTestDetails(event, test) {
		test.expanded = !test.expanded;
	}
}]);