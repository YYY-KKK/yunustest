ngApp.controller('HomeCtrl', ['$scope', '$http', '$rootScope', 'helpers', function ($scope, $http, $rootScope, helpers) {
	$scope.vm = {
		cancelSession: cancelSession,
		duplicateSession: duplicateSession,
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

	/** Return the old session label but append a number at the end. If a
	 * number already exists, increase it by one. */
	function computeDuplicateSessionLabel(oldLabel) {
		if (!oldLabel) return Math.round(Date.now() / 1000).toString();

		oldLabel = oldLabel.trim();

		var baseName;
		var lastNumber;
		var nextLabel;

		var matchNumberedSession = oldLabel.match(/(.+)\s+(\d+)/);
		if (matchNumberedSession) {
			baseName = matchNumberedSession[1];
			lastNumber = parseInt(matchNumberedSession[2]) || 1;
			nextLabel = matchNumberedSession[1] + ' ' + (lastNumber + 1);
		} else {
			nextLabel = oldLabel.trim() + ' 2';
		}


		var existingSessionIndex = $scope.vm.testSessions.find(function (session) { return session.label === nextLabel; });
		if (existingSessionIndex) {
			return computeDuplicateSessionLabel(nextLabel);
		} else {
			return nextLabel;
		}
	}

	function duplicateSession(session) {
		$scope.$parent.vm.sessionLabel = computeDuplicateSessionLabel(session.label);

		// Remove the iteration number from the end of the test name
		// for data-driven tests
		$scope.$parent.vm.selectedTests = session.tests.map(function (test) {
			var match = test.name.match(/^(.*) \[\d+\]$/);
			if (match) {
				var originalTestName = match[1];
				test.name = originalTestName;
			}
			return test;
		});

		// Remove the duplicate names that will appear for test
		// sessions containing data-driven tests
		var uniqueTestNames = [];
		$scope.$parent.vm.selectedTests =
			$scope.$parent.vm.selectedTests.filter(function (test) {
				var testFullName = test.path + '/' + test.name;
				if (uniqueTestNames.indexOf(testFullName) < 0) {
					uniqueTestNames.push(testFullName);
					return true;
				}
			});
		$scope.$parent.vm.maxIterations = session.maxIterations;
		$scope.$parent.vm.actorTags = session.actorTags;
		$('#create-session').modal('show');
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
				$scope.vm.actors = $scope.vm.actors.filter(function(a) { return a.lastSeenTime > tensSecondsAgo; });
				
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
		$http.get('/api/sessions')
			.then(
			function success(res) {
				$scope.vm.isLoadingTestSessions = false;
				$scope.vm.testSessions = res.data;
				$scope.vm.testSessions.forEach(function (session) {
					insertSubtests(session);
				});
			},
			function error(err) {
				$scope.vm.isLoadingTestSessions = false;
				console.log(err.toString());
			});
	}
}]);