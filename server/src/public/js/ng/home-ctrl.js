ngApp.controller('HomeCtrl', ['$scope', '$http', '$rootScope', 'helpers', 'apiAdapter', function ($scope, $http, $rootScope, helpers, apiAdapter) {
	$scope.vm = {
		cancelSession: cancelSession,
		editSession: $scope.$parent.vm.editSession,
		replaySession: $scope.$parent.vm.replaySession,
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

	function init() {
		$rootScope.$on('sessionCreated', function () {
			refreshSessions();
			refreshActors();
		});

		refreshSessions();
		refreshActors();

		if (window.io) {
			// Handle session status updates
			var socketOfSessionStatus = io('/session-status');
			socketOfSessionStatus.on('status-changed', function (data) {
				refreshSessions();
			});
			socketOfSessionStatus.on('progress', function (data) {
				refreshSessions();
			});
			socketOfSessionStatus.on('connect', function () { console.log('Sessions WebSocket connected'); });
			socketOfSessionStatus.on('disconnect', function () { console.log('Sessions WebSocket disconnected'); });

			// Handle actor status updates
			var socketActors = io('/actors');
			socketActors.on('actors-changed', function (data) {
				refreshActors();
			});
			socketActors.on('connect', function () { console.log('Actors WebSocket connected'); });
			socketActors.on('disconnect', function () { console.log('Actors WebSocket disconnected'); });

			setInterval(function () {
				if (!socketOfSessionStatus.connected) {
					socketOfSessionStatus.connect();
				}

				if (!socketActors.connected) {
					socketActors.connect();
				}
			}, 5000);
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

				$scope.$parent.vm.testSessions = $scope.vm.testSessions;
			})
			.catch(function error(err) {
				$scope.vm.isLoadingTestSessions = false;
				console.log(err.toString());
			});
	}
}]);