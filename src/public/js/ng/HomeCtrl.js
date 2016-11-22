ngApp.controller('HomeCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
	$scope.vm = {
		getPassedTestCount: getPassedTestCount,
		moment: moment,
	};

	init();

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
				$scope.vm.testSessions = res.data;

				// Reverse the array to show the most recent sessions on top
				if ($scope.vm.testSessions && $scope.vm.testSessions.length) {
					$scope.vm.testSessions.reverse();
				}
			},
			function error(err) {
				console.log(err.toString());
			});
	}
}])