ngApp.controller('LayoutCtrl', ['$scope', '$http', '$rootScope', 'apiAdapter', function ($scope, $http, $rootScope, apiAdapter) {
	$scope.vm = {
		actorTags: "",
		createSessionFromTemplate: createSessionFromTemplate,
		createTestSession: createTestSession,
		duplicateSession: duplicateSession,
		environments: null,
		editTemplate: editTemplate,
		isLoadingTemplateInfo: true,
		isLoadingTestInfo: true,
		iterations: "1",
		moment: moment,
		selectedEnvironment: null,
		selectedTemplate: null,
		selectedTestsCount: 0,
		sessionLabel: null,
		testParams: null,
		testClick: testClick,
		templates: [],
		tests: [],
		testSessions: null
	};

	var lastClickedTest;

	init();

	function editTemplate() {
		$('#create-from-template').modal('hide');

		if ($scope.vm.selectedTemplate) {
			duplicateSession($scope.vm.selectedTemplate);
		}
	}

	function createSessionFromTemplate(templateName) {
		$('#create-from-template').modal('hide');

		var reqBody = {
			"template": {
				"name": templateName.name,
				"path": templateName.path
			}
		};

		$http.post('/api/session/from-template', reqBody)
			.then(
			function success() {
				$rootScope.$broadcast('sessionCreated');
			},
			function error(res) {
				console.log(res);
			});
	}

	function createTestSession() {
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
			environment: $scope.vm.selectedEnvironment || '',
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

	function duplicateSession(session) {
		$scope.vm.sessionLabel = apiAdapter.computeDuplicateSessionLabel(session.label);

		// Remove the iteration number from the end of the test name
		// for data-driven tests
		$scope.vm.selectedTests = session.tests.map(function (test) {
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
		$scope.vm.selectedTests =
			$scope.vm.selectedTests.filter(function (test) {
				var curatedPath = (test.path || '').replace(/^\/|\/$/g, '');
				var testFullName = curatedPath + '/' + test.name;
				if (uniqueTestNames.indexOf(testFullName) < 0) {
					uniqueTestNames.push(testFullName);
					return true;
				}
			});
		$scope.vm.iterations = (session.maxIterations || 1).toString();
		$scope.vm.actorTags = session.actorTags;
		$scope.vm.selectedEnvironment = session.environment || null;
		$('#create-session').modal('show');
	}

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
			environments = null;
			refreshEnvironments();
			refreshTests();
		});

		$('#create-session').on('hidden.bs.modal', function () {
			$scope.vm.isLoadingTestInfo = true;
			$scope.vm.tests = [];
		});

		$('#create-from-template').on('shown.bs.modal', function () {
			$scope.vm.selectedTemplate = null;
			$scope.vm.isLoadingTemplateInfo = true;
			refreshTemplates();
		});

		$('#create-from-template').on('hidden.bs.modal', function () {
			$scope.vm.isLoadingTemplateInfo = true;
			$scope.vm.templates = [];
		});
	}

	function refreshSelectedTestsCount() {
		$scope.vm.selectedTestsCount = $scope.vm.tests.filter(function (test) { return test.selected; }).length;
	}

	function refreshEnvironments() {
		$scope.vm.templates = [];
		$http.get('/api/environments')
			.then(
			function success(res) {
				if (res.data && res.data.length) {
					$scope.vm.environments = res.data;
				} else {
					$scope.vm.environments = null;
				}
			},
			function error(res) {
				console.log(res.data);
			});
	}

	function refreshTemplates() {
		$scope.vm.templates = [];
		$http.get('/api/templates')
			.then(
			function success(res) {
				$scope.vm.templates = res.data;
				$scope.vm.templates.sort(firstBy('path').thenBy('name'));
				$scope.vm.isLoadingTemplateInfo = false;
			},
			function error(res) {
				console.log(res.data);
			});
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
						var selectedTestPath = selectedTest.path.replace(/^\/|\/$/g, '');
						$scope.vm.tests.forEach(function (test) {
							var currentTestPath = test.path.replace(/^\/|\/$/g, '');
							if ((test.name === selectedTest.name) && (currentTestPath === selectedTestPath)) {
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