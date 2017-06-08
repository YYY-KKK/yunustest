ngApp.controller('HomeCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
	$scope.vm = {
		cancelSession: cancelSession,
		duplicateSession: duplicateSession,
		getCompletedTestCount: getCompletedTestCount,
		getPassedTestCount: getPassedTestCount,
		isLoadingTestSessions: true,
		moment: moment,
		testSessions: null
	};

	init();

	function cancelSession(sessionId) {
		$http.delete('/api/session/' + sessionId)
			.then(
			function success(res) {
				refreshSessions()
			},
			function error(res) {
				console.log(res.data);
			});
	}

	/** Return the old session label but append a number at the end. If a
	 * number already exists, increase it by one. */
	function computeDuplicateSessionLabel(oldLabel) {
		oldLabel = oldLabel.trim();

		if (!oldLabel) return Date.now().toString();

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
		
		
		var existingSessionIndex = $scope.vm.testSessions.find(function(session) { return session.label === nextLabel });
		if (existingSessionIndex) {
			return computeDuplicateSessionLabel(nextLabel);
		} else {
			return nextLabel;
		}
	}

	function duplicateSession(session) {
		$scope.$parent.vm.sessionLabel = computeDuplicateSessionLabel(session.label);
		$scope.$parent.vm.selectedTests = session.tests;
		$scope.$parent.vm.iterations = session.iterations;
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

	function refreshActors() {
		$http.get('/api/actors')
			.then(
			function success(res) {
				$scope.vm.actors = res.data;
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

				// Reverse the array to show the most recent sessions on top
				if ($scope.vm.testSessions && $scope.vm.testSessions.length) {
					$scope.vm.testSessions.reverse();
				}
			},
			function error(err) {
				$scope.vm.isLoadingTestSessions = false;
				console.log(err.toString());
			});
	}
}])