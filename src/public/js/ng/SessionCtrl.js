ngApp.controller('SessionCtrl', ['$scope', '$http', '$window', 'helpers', function ($scope, $http, $window, helpers) {
	var sessionId = $window.sessionId;

	$scope.Math = window.Math;
	$scope.vm = {
		cancelSession: cancelSession,
		getActiveTab: getActiveTab,
		goToTest: goToTest,
		init: init,
		isLoadingSessionInfo: false,
		loadSessionSettingsDefaults: loadSessionSettingsDefaults,
		Math: window.Math,
		moment: moment,
		saveTestResultsAsCsv: saveTestResultsAsCsv,
		session: null,
		sessionSettings: {
			logLevel: "info"
		},
		sessionSettingsChanged: sessionSettingsChanged,
		toggleTestDetails: toggleTestDetails		
	};

	init(sessionId);

	function init(sessionId) {
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
		refreshSession($window.sessionId);

		$('.nav-tabs a').on('shown.bs.tab', function (e) {
			try {
				$scope.$apply();
			} catch (err) { }
		});
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

		var testSelector = "#log td:contains('" + test.name + "')";
		var testElement = $(testSelector).first();

		$('html, body').animate({
			scrollTop: testElement.offset().top - 50
		}, 1000);
	}

	/** Insert data-driven iterations into the tests array, so they can
	 * be displayed in the UI just like regular tests. */
	function insertSubtests(session) {
		for (var testIndex = session.tests.length - 1; testIndex >= 0; --testIndex) {
			var currentTest = session.tests[testIndex];
			if (currentTest.isDataDriven && currentTest.subtests) {
				var subtests = currentTest.subtests.map(function(subtest) {
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
			logLevel: "info"
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

	function refreshSession(sessionId) {
		$http.get('/api/session/' + sessionId)
			.then(function success(res) {
				$scope.vm.session = res.data;
				insertSubtests($scope.vm.session);
				refreshView();
			},
			function error(res) {
				console.log(res.data);
			})
			.then(() => { $scope.vm.isLoadingSessionInfo = false; });
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