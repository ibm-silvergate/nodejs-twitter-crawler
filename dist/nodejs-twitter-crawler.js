
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
var CRITICAL_ERRORS, INVALID_OR_EXPIRED_TOKEN, MAX_COUNT, Promise, RATE_LIMIT_EXCEEDED, TwitterClient, TwitterCrawler, _, enabled, errorCode, extend, getLogger, isArray, isInt, isNaN, isNumericId, isString, winston,
  slice = [].slice,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

TwitterClient = require('twitter');

Promise = require('bluebird');

_ = require('underscore');

isNaN = _.isNaN;

isString = _.isString;

isArray = _.isArray;

extend = _.extendOwn;

winston = require('winston');

MAX_COUNT = 200;

RATE_LIMIT_EXCEEDED = 88;

INVALID_OR_EXPIRED_TOKEN = 89;

CRITICAL_ERRORS = [RATE_LIMIT_EXCEEDED, INVALID_OR_EXPIRED_TOKEN];

isNumericId = function(s) {
  return !isNaN(parseInt(s));
};

getLogger = function(options) {
  if (options == null) {
    options = {};
  }
  return new winston.Logger({
    transports: [
      new winston.transports.Console({
        level: options.debug ? 'debug' : 'info',
        label: "twitter-crawler"
      })
    ]
  });
};

isInt = function(value) {
  return !isNaN(value) && parseInt(Number(value)) === value && !isNaN(parseInt(value, 10));
};

errorCode = function(error) {
  return error.code || (error[0] ? error[0].code : 0);
};

enabled = function(credentials) {
  return credentials.filter((function(_this) {
    return function(c) {
      return (c.enabled == null) || c.enabled;
    };
  })(this));
};

TwitterCrawler = (function() {
  function TwitterCrawler(credentials, options) {
    if (options == null) {
      options = {};
    }
    this.logger = getLogger(options);
    this.setOptions(options);
    this.count = 0;
    this.createClients(credentials);
  }

  TwitterCrawler.prototype.validateCredentials = function(credentials) {
    if (!credentials || (isArray(credentials) && enabled(credentials).length === 0)) {
      throw new Error('You must provide valid credentials');
    }
  };

  TwitterCrawler.prototype.createClients = function(credentials) {
    this.clients = [];
    this.validateCredentials(credentials);
    return enabled(credentials).forEach((function(_this) {
      return function(credential) {
        var client;
        client = new TwitterClient(credential);
        client._instance_id = _this.clients.length;
        client._valid = true;
        return _this.clients.push(client);
      };
    })(this));
  };

  TwitterCrawler.prototype.setOptions = function(options) {
    return this.options = extend({
      debug: false
    }, options);
  };

  TwitterCrawler.prototype.getInstance = function() {
    var attempt, instanceIndex;
    instanceIndex = this.count % this.clients.length;
    attempt = 1;
    this.count++;
    while (!this.clients[instanceIndex]._valid && attempt <= this.clients.length) {
      attempt += 1;
      this.count++;
      instanceIndex = this.count % this.clients.length;
    }
    if (attempt > this.clients.length) {
      return null;
    } else {
      this.logger.debug('Using twitter credentials nº' + instanceIndex);
      return this.clients[instanceIndex];
    }
  };

  TwitterCrawler.prototype.callApi = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (!(method === 'get' || method === 'post')) {
      throw new Error('Method \'' + method + '\' not implemented.');
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var callback, instance, message;
        instance = _this.getInstance();
        if (instance != null) {
          callback = function(err, data) {
            var errorMessage, ref;
            if (err) {
              errorMessage = 'Error calling \'' + args[0] + '\' api ' + '[' + method.toUpperCase() + '] on instance ' + instance._instance_id + '.';
              if (errorCode(err) === 32) {
                errorMessage += ' Error code: ' + errorCode(err) + '.';
                _this.logger.error(errorMessage, 'Using another instance.', err);
                _this.callApi.apply(_this, [method].concat(slice.call(args))).then(resolve)["catch"](reject);
              }
              if (ref = errorCode(err), indexOf.call(CRITICAL_ERRORS, ref) >= 0) {
                errorMessage += ' Error code: ' + errorCode(err) + '.';
                instance._valid = false;
                instance._error = err;
                _this.logger.error(errorMessage, 'Using another instance.', err);
                return _this.callApi.apply(_this, [method].concat(slice.call(args))).then(resolve)["catch"](reject);
              } else {
                _this.logger.error(errorMessage);
                _this.logger.error(err);
                return reject(err);
              }
            } else {
              return resolve(data);
            }
          };
          return instance[method].apply(instance, args.concat([callback]));
        } else {
          message = 'All instances are invalid! Review your credentials';
          _this.logger.debug(message);
          return reject(new Error(message));
        }
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
          var limitReached, message, output, user;
          user = incomingTweets[0].user;
          if (options.limit && user.statuses_count < options.limit) {
            options.limit = user.statuses_count;
          }
          if (options.min_tweets && user.statuses_count < options.min_tweets) {
            message = ['Not enough tweets for user @', user.screen_name, ':', 'expected at least', options.min_tweets, 'but user has', user.statuses_count, 'tweets'].join(' ');
            _this.logger.error(message);
            return reject(new Error(message));
          } else {
            _this.logger.debug('Obtained', incomingTweets.length, 'tweets for user', '@' + user.screen_name + '.', 'Total collected tweets for @' + user.screen_name + ':', incomingTweets.length + accumulatedTweets.length);
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
          }
        };
        return _this.get('statuses/user_timeline', params).done(crawler, reject);
      };
    })(this));
  };

  TwitterCrawler.prototype.getTweets = function(params, options) {
    var userId;
    if (options == null) {
      options = {};
    }
    if (isString(params) || isNumericId(params)) {
      userId = params;
      params = {
        user_id: (isNumericId(userId) ? userId : void 0),
        screen_name: (!(isNumericId(userId)) ? userId.replace('@', '') : void 0),
        count: MAX_COUNT,
        exclude_replies: true,
        maxId: void 0,
        include_rts: false
      };
    }
    return this._getTweets(params, options);
  };

  TwitterCrawler.prototype.getUser = function(params) {
    var userId;
    if (isString(params) || isNumericId(params)) {
      userId = params;
      params = {
        user_id: (isNumericId(userId) ? userId : void 0),
        screen_name: (!(isNumericId(userId)) ? userId.replace('@', '') : void 0)
      };
    }
    return this.get('users/show', params);
  };

  return TwitterCrawler;

})();

module.exports = TwitterCrawler;
