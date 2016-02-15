'use strict';

define(['ably', 'shared_helper'], function(Ably, helper) {
	var rest, exports = {},
		Defaults = Ably.Rest.Defaults;

	exports.setupHttp = function(test) {
		test.expect(1);
		helper.setupApp(function() {
			rest = helper.AblyRest();
			test.ok(true, 'App created');
			test.done();
		});
	}

	exports.apiVersionHeader = function(test) {

		//Intercept get&post methods with test
		Ably.Rest.Http.get_inner = Ably.Rest.Http.get;
		Ably.Rest.Http.get = function (rest, path, headers, params, callback) {
			test.ok(('X-Ably-Version' in headers), 'Verify version header exists');
			test.equal(headers['X-Ably-Version'], Defaults.apiVersion, 'Verify current version number');
			return this.get_inner(rest, path, headers, params, callback);
		};

		Ably.Rest.Http.post_inner = Ably.Rest.Http.post;
		Ably.Rest.Http.post = function (rest, path, headers, body, params, callback) {
			test.ok(('X-Ably-Version' in headers), 'Verify version header exists');
			test.equal(headers['X-Ably-Version'], Defaults.apiVersion, 'Verify for current version number');
			return this.post_inner(rest, path, headers, body, params, callback);
		};

		//Call all methods that use rest http calls
		test.expect(8);

		rest.auth.requestToken();
		rest.time();
		rest.stats();
		rest.channels.get().publish();

		test.done();

	};

	return module.exports = helper.withTimeout(exports);
});
