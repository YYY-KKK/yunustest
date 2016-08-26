ngApp.controller('GlobalCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
	$scope.vm = {
		moment: moment,
		runTestSession: runTestSession,
		tests: []
	};

	init();

	function init() {
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