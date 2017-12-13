ngApp.controller('HomeCtrl', ['$scope', '$http', '$rootScope', 'helpers', 'apiAdapter', function ($scope, $http, $rootScope, helpers, apiAdapter) {
	$scope.vm = {
		cancelSession: cancelSession,
		duplicateSession: $scope.$parent.vm.duplicateSession,
		getCompletedTestCount: getCompletedTestCount,
		getPassedTestCount: getPassedTestCount,
		isLoadingTestSessions: true,
		moment: moment,
		testSessions: []
	};

	init();

	function cancelSession(sessionId) {
		$http.delete('/api/session/' + sessionId)
			.then(
			function success(res) {
				refreshSessions();
			},
			function error(res) {
				console.log(res.data);
			});
	}

	function getCompletedTestCount(session) {
		return session.tests.filter(function (t) { return t.status === 'completed'; }).length;
	}

	function getPassedTestCount(session) {
		return session.tests.filter(function (t) { return t.result === 'passed'; }).length;
	}

	function init() {
		$rootScope.$on('sessionCreated', function () {
			refreshSessions();
			refreshActors();
		});

		refreshSessions();
		refreshActors();
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

	function refreshActors() {
		$http.get('/api/actors')
			.then(
			function success(res) {
				var tensSecondsAgo = Date.now() - 10 * 1000;
				$scope.vm.actors = res.data;
				$scope.vm.actors = $scope.vm.actors.filter(function (a) { return a.lastSeenTime > tensSecondsAgo; });

				if ($scope.vm.actors.length) {
					$scope.vm.actors.forEach(function (actor) {
						actor.lastSeenTimeFmt = moment(actor.lastSeenTime).format('HH:mm:ss');
					});
				}
			},
			function error(err) {
				console.log(err.toString());
			});
	}

	function refreshSessions() {
		apiAdapter.refreshSessions()
			.then(function success(sessions) {
				$scope.vm.isLoadingTestSessions = false;
				$scope.vm.testSessions = sessions;
				$scope.vm.testSessions.forEach(function (session) {
					insertSubtests(session);
				});

				$scope.$parent.vm.testSessions = $scope.vm.testSessions;
			})
			.catch(function error(err) {
				$scope.vm.isLoadingTestSessions = false;
				console.log(err.toString());
			});
	}
}]);