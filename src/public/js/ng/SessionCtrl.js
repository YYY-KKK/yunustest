ngApp.controller('SessionCtrl', ['$scope', '$http', '$window', function ($scope, $http, $window) {
	var sessionId = $window.sessionId;

	$scope.vm = {
		cancelSession: cancelSession,
		getActiveTab: getActiveTab,
		goToTest: goToTest,
		init: init,
		Math: Math,
		loadSessionSettingsDefaults: loadSessionSettingsDefaults,
		moment: moment,
		saveTestResultsAsCsv: saveTestResultsAsCsv,
		session: null,
		sessionSettings: {
			logLevel: "info"
		},
		sessionSettingsChanged: sessionSettingsChanged
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

	function loadSessionSettingsDefaults() {
		$scope.vm.sessionSettings = {
			logLevel: "info"
		};
		sessionSettingsChanged();
	}

	function sessionSettingsChanged() {
		Cookies.set('sessionSettings', JSON.stringify($scope.vm.sessionSettings));
		refreshView();
	}

	function refreshSession(sessionId) {
		$http.get('/api/session/' + sessionId)
			.then(function success(res) {
				$scope.vm.session = res.data;
				refreshView();
			},
			function error(res) {
				console.log(res.data);
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

	function saveTestResultsAsCsv() {
		var header = 'Test name,Test path,Duration,Result\n';

		var testResults = $scope.vm.session.tests.map(function (t) {
			return format('{0},{1},{2},{3}',
				t.name,
				t.path,
				t.timeCompleted ? Math.round((t.timeCompleted - t.timeStarted) / 1000) + ' sec' : 'N/A',
				t.result || 'pending');
		}).join('\n');
		if ($scope.vm.session) {
			saveAs(new Blob([header + testResults]), format("test-session-{0}.csv", $scope.vm.session.id));
		}
	}
}])