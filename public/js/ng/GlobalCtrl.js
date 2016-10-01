ngApp.controller('GlobalCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
	$scope.vm = {
		moment: moment,
		runTestSession: runTestSession,
		tests: []
	};

	init();

	function init() {
		$('#create-session').on('shown.bs.modal', function() {
			if (!$scope.vm.tests.length || $scope.vm.tests.length < 50) {
				refreshTests();
			}
		});

		$('#create-session').on('hidden.bs.modal', function() {
			if ($scope.vm.tests.length && $scope.vm.tests.length < 50) {
				$scope.vm.tests = [];
				console.log('Test catalog was cleared');
			}
		});
	}

	function refreshTests() {
		$scope.vm.tests = [];
		$http.get('/api/tests')
			.then(
				function success(res) {
					$scope.vm.tests = res.data;
				},
				function error(res) {
					console.log(res.data);
				});
	}

	function runTestSession() {
		var tests = $scope.vm.tests.filter(function(t) { return t.selected; });

		if (!tests.length) { return; }
		
		$http.post('/api/session', { tests: tests })
		.then(
			function success() {
				$rootScope.$broadcast('sessionCreated');
			},
			function error(res) {
				console.log(res.data);
			});
	}
}])