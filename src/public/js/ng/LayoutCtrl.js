ngApp.controller('LayoutCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
	$scope.vm = {
		actorTags: "",
		isLoadingTestInfo: false,
		iterations: "1",
		moment: moment,
		runTestSession: runTestSession,
		selectedTestsCount: 0,
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
			});

		return testParams.sort();
	}

	function init() {
		$('#create-session').on('shown.bs.modal', function () {
			$scope.vm.isLoadingTestInfo = true;
			$scope.vm.selectedTestsCount = 0;
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

	function refreshSelectedTestsCount() {
		$scope.vm.selectedTestsCount = $scope.vm.tests.filter(function (test) { return test.selected; }).length;
	}

	function refreshTests() {
		$scope.vm.tests = [];
		$http.get('/api/tests')
			.then(
			function success(res) {
				$scope.vm.isLoadingTestInfo = false;
				$scope.vm.tests = res.data;

				$scope.vm.tests.sort(firstBy('path').thenBy('name'));

				if ($scope.vm.selectedTests) {
					$scope.vm.selectedTests.forEach(function (selectedTest) {
						$scope.vm.tests.forEach(function (test) {
							if ((test.name === selectedTest.name) && (test.path === selectedTest.path)) {
								test.selected = true;
							}
						});
					});
					$scope.vm.selectedTests = null;
				}

				refreshSelectedTestsCount();
			},
			function error(res) {
				console.log(res.data);
			});
	}

	function runTestSession() {
		var tests = $scope.vm.tests.filter(function (t) { return t.selected; });

		if (!tests.length) { return; }

		var testInfos = tests.map(function (test) {
			return {
				name: test.name,
				path: test.path
			};
		});


		var actorTags = [];

		if ($scope.vm.actorTags) {
			if (typeof $scope.vm.actorTags === 'string') {
				actorTags = $scope.vm.actorTags.split(",");
			} else if ($scope.vm.actorTags.length) {
				actorTags = $scope.vm.actorTags;
			}
		}

		// Filter out any empty tags
		actorTags = actorTags.filter(function (t) {
			return String(t).trim().length > 0;
		});

		var reqBody = {
			actorTags: actorTags,
			maxIterations: $('#session-iterations').val(),
			sessionLabel: $scope.vm.sessionLabel,
			tests: testInfos
		};

		$http.post('/api/session', reqBody)
			.then(
			function success() {
				$rootScope.$broadcast('sessionCreated');
			},
			function error(res) {
				console.log(res);
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
		refreshSelectedTestsCount();
	}
}]);