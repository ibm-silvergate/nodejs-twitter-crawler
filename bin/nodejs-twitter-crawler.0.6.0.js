
/*
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MAX_COUNT, Promise, TwitterClient, TwitterCrawler, _extend, extend, getLogger, isInt,
  slice = [].slice;

TwitterClient = require('twitter');

Promise = require('promise');

_extend = require('extend');

extend = function() {
  var objects;
  objects = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  return _extend.apply(null, [true].concat(slice.call(objects)));
};

MAX_COUNT = 200;

getLogger = function(debug) {
  return {
    info: console.info.bind(console),
    error: console.error.bind(console),
    debug: debug ? console.info.bind(console) : (function() {})
  };
};

isInt = function(value) {
  return !isNaN(value) && parseInt(Number(value)) === value && !isNaN(parseInt(value, 10));
};

TwitterCrawler = (function() {
  function TwitterCrawler(credentials, options) {
    if (options == null) {
      options = {};
    }
    this.setOptions(options);
    this.logger = getLogger(this.options.debug);
    this.count = 0;
    this.createClients(credentials);
  }

  TwitterCrawler.prototype.createClients = function(credentials) {
    this.clients = [];
    return credentials.forEach((function(_this) {
      return function(credential) {
        var client;
        if (credential.enabled != null) {
          client = new TwitterClient(credential);
          client._instance_id = _this.clients.length;
          return _this.clients.push(client);
        }
      };
    })(this));
  };

  TwitterCrawler.prototype.setOptions = function(options) {
    return this.options = extend({
      debug: false
    }, options);
  };

  TwitterCrawler.prototype.getInstance = function() {
    var instanceIndex;
    instanceIndex = this.count % this.clients.length;
    this.count++;
    this.logger.debug('Using twitter credentials nº' + instanceIndex);
    return this.clients[instanceIndex];
  };

  TwitterCrawler.prototype.callApi = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (!(method === 'get' || method === 'post')) {
      throw new Error('Method \'' + method + '\' not implemented.');
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var callback, instance;
        instance = _this.getInstance();
        callback = function(err, data) {
          var errorMessage;
          if (err) {
            errorMessage = 'Error calling \'' + args[0] + '\' api ' + '[' + method.toUpperCase() + '] on instance ' + instance._instance_id + '.';
            if (err.code === 32 || (err[0] && err[0].code === 32)) {
              _this.logger.error(errorMessage, 'Using another instance.', err);
              return _this.callApi.apply(_this, [method].concat(slice.call(args)));
            } else {
              _this.logger.error(errorMessage, err);
              return reject(err);
            }
          } else {
            return resolve(data);
          }
        };
        return instance[method].apply(instance, args.concat([callback]));
      };
    })(this));
  };

  TwitterCrawler.prototype.get = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return this.callApi.apply(this, ['get'].concat(slice.call(args)));
  };

  TwitterCrawler.prototype.post = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return this.callApi.apply(this, ['post'].concat(slice.call(args)));
  };

  TwitterCrawler.prototype._getTweets = function(params, options, accumulatedTweets) {
    if (accumulatedTweets == null) {
      accumulatedTweets = [];
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var crawler;
        crawler = function(incomingTweets) {
          var limitReached, output;
          _this.logger.debug('Obtained', incomingTweets.length, 'for userId', params.user_id + '.', 'Total tweets for user:', incomingTweets.length + accumulatedTweets.length);
          limitReached = options.limit && (accumulatedTweets.length + incomingTweets.length) > options.limit;
          if (incomingTweets.length > 1 && !limitReached) {
            return _this._getTweets(extend(params, {
              maxId: incomingTweets[incomingTweets.length - 1].id - 1
            }), options, accumulatedTweets.concat(incomingTweets)).done(resolve, reject);
          } else {
            output = accumulatedTweets.concat(incomingTweets);
            if (options.limit) {
              output = output.slice(0, +options.limit + 1 || 9e9);
            }
            return resolve(output);
          }
        };
        return _this.get('statuses/user_timeline', params).done(crawler, reject);
      };
    })(this));
  };

  TwitterCrawler.prototype.getTweets = function(userId, options) {
    var params;
    if (options == null) {
      options = {};
    }
    params = {
      user_id: (isInt(userId) ? userId : void 0),
      screen_name: (!(isInt(userId)) ? userId.replace('@', '') : void 0),
      count: MAX_COUNT,
      exclude_replies: true,
      trim_user: true,
      maxId: void 0
    };
    return this._getTweets(params, options);
  };

  TwitterCrawler.prototype.getUser = function(userId) {
    var params;
    params = {
      user_id: (isInt(userId) ? userId : void 0),
      screen_name: (!(isInt(userId)) ? userId.replace('@', '') : void 0)
    };
    return this.get('users/show', params);
  };

  return TwitterCrawler;

})();

module.exports = TwitterCrawler;
