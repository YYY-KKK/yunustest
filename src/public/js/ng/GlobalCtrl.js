ngApp.controller('GlobalCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
	$scope.vm = {
		moment: moment,
		runTestSession: runTestSession,
		testClick: testClick,
		tests: []
	};

	var lastClickedTest;

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

	function testClick(event, test) {
		if (event.shiftKey && lastClickedTest) {
			var previousClickedTestIndex = $scope.vm.tests.indexOf(lastClickedTest);
			var clickedTestIndex = $scope.vm.tests.indexOf(test);

			if (previousClickedTestIndex >= 0 && clickedTestIndex >= 0) {
				var firstTestIndex = Math.min(previousClickedTestIndex, clickedTestIndex);
				var lastTestIndex = Math.max(previousClickedTestIndex, clickedTestIndex);

				for (var testIndex = firstTestIndex; testIndex <= lastTestIndex; ++testIndex) {
					$scope.vm.tests[testIndex].selected = test.selected;
				}
			}
		}

		lastClickedTest = test;
	}
}])