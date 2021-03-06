;(function(context) {
  Tests.addSuite('Pusher.Channel', {
    'Events': {
      'Public Channel': {
        'subscription lifecycle': function(test) {
          var channel = Pusher.Channel.factory('public-channel', {});
          channel.bind('pusher:subscription_succeeded', function() {
            test.equal(channel.subscribed, true, 'Channel should be marked as subscribed after ack');

            channel.disconnect();
            test.equal(channel.subscribed, false);

            test.finish();
          });

          test.equal(channel.subscribed, false, 'Channel should not be marked as subscribed before ack');
          channel.emit('pusher_internal:subscription_succeeded', {});
        }
      },

      'Private Channel': {
        'subscription lifecycle': function(test) {
          Pusher.channel_auth_transport = 'test';
          Pusher.authorizers['test'] = function() {
            callback({});
          };

          var channel = Pusher.Channel.factory('private-channel', {});
          channel.bind('pusher:subscription_succeeded', function() {
            test.equal(channel.subscribed, true, 'Channel should be marked as subscribed after ack');

            channel.disconnect();
            test.equal(channel.subscribed, false);

            test.finish();
          });

          test.equal(channel.subscribed, false, 'Channel should not be marked as subscribed before ack');
          channel.emit('pusher_internal:subscription_succeeded', {});
        }
      },

      'Client Trigger': function(test) {
        test.numAssertions = 3;

        var PusherMock = {
          send_event: function(name, data, channel) {
            test.equal('client-foo', name, 'Event names should be equal');
            test.deepEqual({'bar': 'baz'}, data, 'Event data should be sent');
            test.equal('clientEvents', channel, 'The channel name should be auto-populated');
          }
        };

        Pusher.channel_auth_transport = 'test';
        Pusher.authorizers['test'] = function() {
          callback({});
        };

        var channel = Pusher.Channel.factory('clientEvents', PusherMock);

        channel.trigger('client-foo', {'bar': 'baz'});
        test.finish();
      }
    },

    'user_info is sent if specified': function(test) {
      user_id = '123';
      user_info = "g";
      var presenceChannel = Pusher.Channel.factory('presence-woo', {});

      presenceChannel.bind('pusher:member_added', function(member) {
        test.equal(member.info, user_info, "member info should be null");
        test.finish();
      });

      presenceChannel.emit('pusher_internal:member_added', {
        'user_id': user_id,
        'user_info': user_info
      });
    },

    'user_info is optional': function(test) {
      user_id = '123';
      var presenceChannel = Pusher.Channel.factory('presence-woo', {});

      presenceChannel.bind('pusher:member_added', function(member) {
        test.equal(member.info, undefined, "member info should be undefined");
        test.equal(member.id, user_id, "member id should be what was sent");
        test.finish();
      });

      presenceChannel.emit('pusher_internal:member_added', {
        'user_id': user_id
      });
    },

    'trigger() should return false if not connected': function(test) {
      test.numAssertions = 1;

      var pusher = new Pusher('testing');
      var channel = pusher.subscribe('foo');
      // stop the initial connection attempt.
      pusher.disconnect();
      // Override the state machine, as trigger only checks
      // the value of the machine state.
      pusher.connection._machine.state = 'permanentlyClosed';
      pusher.connection.socket = new TestSocket()

      test.equal(channel.trigger('foo', 'bar'), false, 'channel.trigger should return false.');
      test.finish();
    },

    'trigger() should return true if connected': function(test) {
      // make real pusher and stop it connecting
      var pusher = new Pusher('testing');
      pusher.disconnect();

      // create connected connection with mocked ws
      Pusher.Transport = TestSocket;
      withConnectedConnection(test, {}, function(connection) {
        // graft connection w/ mocked ws onto real pusher
        pusher.connection = connection;

        // check trigger returns true
        var channel = pusher.subscribe('foo');
        test.equal(channel.trigger('foo', 'bar'), true);
        test.finish();
      });
    }
  });
})(this);
