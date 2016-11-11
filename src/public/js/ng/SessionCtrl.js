ngApp.controller('SessionCtrl', ['$scope', '$http', '$window', function ($scope, $http, $window) {
	var sessionId = $window.sessionId;

	$scope.vm = {
		cancelSession: cancelSession,
		getActiveTab: getActiveTab,
		goToTest: goToTest,
		init: init,
		Math: Math,
		moment: moment,
		session: null
	};

	init(sessionId);

	function init(sessionId) {
		refreshSession($window.sessionId);

		$('.nav-tabs a').on('shown.bs.tab', function (e) {
			$scope.$apply();
		});
	}

	function cancelSession(sessionId) {
		$http.delete('/api/session/' + sessionId)
			.then(
			function success(res) {
				refreshSession(sessionId);
			},
			function error(res) {
				console.log(res.data);
			});
	}

	function getActiveTab() {
		return $('div:visible.tab-pane').first().attr('id');
	}

	function goToTest(test) {
		var testSelector = "#log td:contains('" + test.name + "')";
		var testElement = $(testSelector).first();

		$('html, body').animate({
			scrollTop: testElement.offset().top - 50
		}, 1000);
	}

	function refreshSession(sessionId) {
		$http.get('/api/session/' + sessionId)
			.then(
			function success(res) {
				$scope.vm.session = res.data;
			},
			function error(res) {
				console.log(res.data);
			});
	}
}])