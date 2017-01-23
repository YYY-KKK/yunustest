ngApp.controller('GlobalCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
	$scope.vm = {
		moment: moment,
		runTestSession: runTestSession,
		sessionLabel: null,
		testParams: null,
		testClick: testClick,
		tests: [],
	};

	var lastClickedTest;

	init();

	function extractTestParams(tests) {
		// Get the list of parameters from all the tests included in this session
		var paramArrays = tests
			.map(function (t) { return t.params ? t.params : undefined; })
			.filter(function (a) { return a !== undefined; });
		var testParams = [].concat.apply([], paramArrays);

		// Eliminate duplicates
		testParams = testParams
			.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			})
			
		return testParams.sort();
	}

	function init() {
		$('#create-session').on('shown.bs.modal', function () {
			$('#test-catalog-progress').show();
			$('#test-catalog-progress .progress-bar')
				.width("10%")
				.show()
				.animate({ width: "100%" }, 3000)

			refreshTests();
		});

		$('#create-session').on('hidden.bs.modal', function () {
			$scope.vm.tests = [];
			$scope.$apply();
		});

		$('#create-session').on('hidden.bs.modal', function () {
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
				// Hide the progress bar and display the test catalog data
				$('#test-catalog-progress .progress-bar')
					.width('100%')
					.finish()
					.delay(500)
					.queue(function () {
						$('#test-catalog-progress').hide();
						$scope.vm.tests = res.data;
						$scope.$apply();
					});
			},
			function error(res) {
				console.log(res.data);
			});
	}

	function runTestSession() {
		var tests = $scope.vm.tests.filter(function (t) { return t.selected; });

		if (!tests.length) { return; }

		var testParams = extractTestParams(tests);
		$scope.vm.testParams = testParams.map(function(tp) {
			return { "name": tp, "value": tp + " value" };
		});

		// $('#create-session').modal('hide').on('hidden.bs.modal', function () {
		// 	$('#session-parameters').modal('show');
		// });

		var reqBody = {
			sessionLabel: $scope.vm.sessionLabel,
			tests: tests
		};

		$http.post('/api/session', reqBody)
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
			var previousClickedTestIndex = $scope.vm.filteredTests.indexOf(lastClickedTest);
			var clickedTestIndex = $scope.vm.filteredTests.indexOf(test);

			if (previousClickedTestIndex >= 0 && clickedTestIndex >= 0) {
				var firstTestIndex = Math.min(previousClickedTestIndex, clickedTestIndex);
				var lastTestIndex = Math.max(previousClickedTestIndex, clickedTestIndex);

				for (var testIndex = firstTestIndex; testIndex <= lastTestIndex; ++testIndex) {
					if ($scope.vm.filteredTests[testIndex]) {
						$scope.vm.filteredTests[testIndex].selected = test.selected;
					}
				}
			}
		}

		lastClickedTest = test;
	}
}])