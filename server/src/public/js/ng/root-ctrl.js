ngApp.controller('LayoutCtrl', ['$scope', '$http', '$rootScope', 'apiAdapter', 'helpers', function ($scope, $http, $rootScope, apiAdapter, helpers) {
	$scope.vm = {
		actorTags: "",
		createSessionFromTemplate: createSessionFromTemplate,
		createTestSession: createTestSession,
		editSession: editSession,
		environments: null,
		editTemplate: editTemplate,
		isLoadingTemplateInfo: true,
		isLoadingTestInfo: true,
		iterations: "1",
		moment: moment,
		replaySession: replaySession,
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

	/** Stores a reference to the test that was last clicked, to support
	 * shift+click when selecting tests for a session. */
	var lastClickedTest;

	init();

	/** Check the release version in GitHub, compare it with the installed
	 * version and notify the user if a new version is available. */
	function checkVersion() {
		var nextVersionCheckTimestamp = parseInt(Cookies.get('nextVersionCheckTimestamp')) || 0;

		if (!nextVersionCheckTimestamp || (Date.now() >= nextVersionCheckTimestamp)) {
			$http.get('/api/build-info')
				.then(function success(res) {
					var currentVersion = parseVersion(res.data && res.data.version);

					$http.get('https://api.github.com/repos/mcdcorp/opentest/releases')
						.then(
							function success(res) {
								var eightDaysLater = Date.now() + (8 * 24 * 60 * 60 * 1000);
								Cookies.set('nextVersionCheckTimestamp', eightDaysLater);

								var latestVersionStr = res.data && res.data[0] && res.data[0].tag_name;
								var latestVersionUrl = res.data && res.data[0] && res.data[0].html_url;
								var latestVersion = parseVersion(latestVersionStr);
								if (latestVersion && (compareVersions(latestVersion, currentVersion) === 1)) {
									$.notify(
										{
											message:
												'A new OpenTest version is now available: <a href="' + latestVersionUrl + '" target="_blank">' + latestVersionStr + '</a>. ' +
												'You should always stay on the latest version to benefit from new features and security updates.'
										}, {
											type: 'info',
											delay: 0,
											placement: { from: 'bottom' }
										})
								}
							},
							function error(res) {
								var oneHourLater = Date.now() + (60 * 60 * 1000);
								Cookies.set('nextVersionCheckTimestamp', oneHourLater);
							});
				});
		}
	}

	function compareVersions(v1, v2) {
		for (var i = 0; i < v1.length; ++i) {
			if (v2.length == i) {
				return 1;
			}

			if (v1[i] == v2[i]) {
				continue;
			} else if (v1[i] > v2[i]) {
				return 1;
			} else {
				return -1;
			}
		}

		if (v1.length != v2.length) {
			return -1;
		}

		return 0;
	}

	function createSessionFromTemplate(templateName) {
		$('#create-from-template').modal('hide');

		var reqBody = {
			"template": {
				"name": templateName.name,
				"path": templateName.path
			}
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
				actorTags = $scope.vm.actorTags
					.split(",");
			} else if ($scope.vm.actorTags.length) {
				actorTags = $scope.vm.actorTags;
			}
		}

		// Trim space around tags and filter
		// out any empty tags, if any
		actorTags = actorTags
			.map(function (tag) {
				return tag.trim();
			})
			.filter(function (t) {
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

	function editSession(uiSession) {
		apiAdapter.getSession(uiSession.id)
			.then(function (session) {
				session = session || uiSession;
				$scope.vm.sessionLabel = apiAdapter.computeDuplicateSessionLabel(session.label || session.sessionLabel);

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
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function editTemplate() {
		$('#create-from-template').modal('hide');

		if ($scope.vm.selectedTemplate) {
			var templateRelativePath = helpers.trimChars(
				$scope.vm.selectedTemplate.path + "/" + $scope.vm.selectedTemplate.name,
				'/');

			// Request the list of tests for the template
			$http.get('/api/template/tests?path=' + templateRelativePath)
				.then(
					function success(res) {
						return res.data;
					},
					function error(err) {
						console.log(err.toString());
						return $scope.vm.selectedTemplate.tests || [];
					})
				.then(function(tests) {
					var session = {
						sessionLabel: $scope.vm.selectedTemplate.sessionLabel,
						iterations: $scope.vm.selectedTemplate.iterations,
						actorTags: $scope.vm.selectedTemplate.actorTags,
						tests: tests || $scope.vm.selectedTemplate.tests || []
					};
					editSession(session);
				});
		}
	}

	function init() {
		$('#create-session').on('shown.bs.modal', function () {
			$scope.vm.isLoadingTestInfo = true;
			$scope.vm.selectedTestsCount = 0;
			refreshEnvironments();
			refreshTests();
		});

		$('#create-session').on('hidden.bs.modal', function () {
			$scope.vm.isLoadingTestInfo = true;
			$scope.vm.tests = [];
			helpers.safeApply($scope);
		});

		$('#create-from-template').on('shown.bs.modal', function () {
			$scope.vm.selectedTemplate = null;
			$scope.vm.isLoadingTemplateInfo = true;
			refreshTemplates();
		});

		$('#create-from-template').on('hidden.bs.modal', function () {
			$scope.vm.isLoadingTemplateInfo = true;
			$scope.vm.templates = [];
			helpers.safeApply($scope);
		});

		setupVersionCheck();
	}

	/** Parses a semantic version string into an array of three integers. */
	function parseVersion(versionString) {
		if (typeof versionString !== 'string') {
			return null;
		}

		var versionRegexMatch = versionString.match(/v?(\d+)\.(\d+)\.(\d+)/i);
		if (versionRegexMatch) {
			return [parseInt(versionRegexMatch[1]), parseInt(versionRegexMatch[2]), parseInt(versionRegexMatch[3])];
		} else {
			return null;
		}
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
							var selectedTestPath = (selectedTest.path || '').replace(/^\/|\/$/g, '');
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

	function replaySession(uiSession) {
		apiAdapter.getSession(uiSession.id)
			.catch(function (err) {
				console.log(err);
			})
			.then(function (session) {
				var template = session;
				template.sessionLabel = apiAdapter.computeDuplicateSessionLabel(session.label);

				$http.post('/api/session', template)
					.then(
						function success() {
							$rootScope.$broadcast('sessionCreated');
						},
						function error(res) {
							console.log(res);
						});
			});
	}

	/** Setup a timer to check the latest release version in GitHub and
	 * compare it with the installed version. */
	function setupVersionCheck() {
		setInterval(checkVersion, 15 * 60 * 1000);
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