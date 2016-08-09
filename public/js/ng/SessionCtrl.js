ngApp.controller('SessionCtrl', ['$scope', '$http', '$window', function($scope, $http, $window) {
	var sessionId = $window.sessionId;

	$scope.vm = {
		init: init,
		Math: Math,
		session: null
	};

	init(sessionId);
	
	function init(sessionId) {
		refreshSession($window.sessionId);
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