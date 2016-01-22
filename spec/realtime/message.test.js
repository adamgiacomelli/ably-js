"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		testOnAllTransports = helper.testOnAllTransports;

	var publishIntervalHelper = function(currentMessageNum, channel, dataFn, onPublish){
			return function(currentMessageNum) {
				console.log('sending: ' + currentMessageNum);
				channel.publish('event0', dataFn(), function() {
					console.log('publish callback called');
					onPublish();
				});
			};
		},
		publishAtIntervals = function(numMessages, channel, dataFn, onPublish){
			for(var i = numMessages; i > 0; i--) {
				setTimeout(publishIntervalHelper(i, channel, dataFn, onPublish), 20*i);
			}
		};

	exports.setupMessage = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, displayError(err));
			} else {
				test.ok(true, 'setup app');
			}
			test.done();
		});
	};



	exports.publishVariations = function(test) {
		var testData = 'Some data';
		var errorCallback = function(err){
			if(err) {
				console.log("Error callback: ", err)
				test.ok(false, 'Error received by publish callback ' + displayError(err));
				closeAndFinish(test, realtime);
				return;
			}
		};
		var testArguments = [
			[{name: 'objectWithName'}],
			[{name: 'objectWithNameAndCallback'}, errorCallback],
			[{name: 'objectWithNameAndNullData', data: null}],
			[{name: 'objectWithNameAndUndefinedData', data: undefined}],
			[{name: 'objectWithNameAndEmptyStringData', data: ''}],
			['nameAndNullData', null],
			['nameAndUndefinedData', undefined],
			['nameAndEmptyStringData', ''],
			['nameAndData', testData],
			['nameAndDataAndCallback', testData, errorCallback],
			[{name: 'objectWithNameAndData', data: testData}],
			[{name: 'objectWithNameAndDataAndCallback', data: testData}, errorCallback],
			// 6 messages with null name,
			[null, testData],
			[null, testData, errorCallback],
			[{name: null, data: testData}],
			[null, null],
			[{name: null}],
			[{name: null, data: null}]
		];

		test.expect(testArguments.length * 2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime({log: {level: 4}});
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishVariations');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + displayError(err));
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to different message types */
					var messagesReceived = 0;
					rtChannel.subscribe(function(msg) {
						console.log("Received " + (messagesReceived + 1) + '/' + testArguments.length + ': ' + JSON.stringify(msg))
						test.ok(true, 'Received ' + msg.name);
						++messagesReceived;
						switch(msg.name) {
							case 'objectWithName':
							case 'objectWithNameAndCallback':
							case 'objectWithNameAndNullData':
							case 'objectWithNameAndUndefinedData':
							case 'nameAndNullData':
							case 'nameAndUndefinedData':
								test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								break;
							case 'nameAndEmptyStringData':
							case 'objectWithNameAndEmptyStringData':
								test.strictEqual(msg.data, '', 'Msg data received was a ' + typeof(msg.data) + ' when should have been an empty string');
								break;
							case 'objectWithNameAndFalseData':
							case 'nameAndFalseData':
								test.strictEqual(msg.data, false, 'Msg data received was a ' + typeof(msg.data) + ' when should have been a bool false');
								break;
							case 'nameAndData':
							case 'nameAndDataAndCallback':
							case 'objectWithNameAndData':
							case 'objectWithNameAndDataAndCallback':
								test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								break;
							case undefined:
								if (msg.data) {
									// 3 messages: null name and data, null name and data and callback, object with null name and data
									test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								} else {
									// 3 messages: null name and null data, object with null name and no data, object with null name and null data
									test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								}
								break;
							default:
								test.ok(false, 'Unexpected message ' + msg.name + 'received');
								closeAndFinish(test, realtime);
						}

						if (messagesReceived == testArguments.length) {
							closeAndFinish(test, realtime);
						}
					});

					/* publish events */
					var restChannel = rest.channels.get('publishVariations');
					for(var i = 0; i < testArguments.length; i++) {
						console.log("Sending " + JSON.stringify(testArguments[i]))
						restChannel.publish.apply(restChannel, testArguments[i]);
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};


	return module.exports = helper.withTimeout(exports);
});
