/**
 * Copyright 2015-2016 IBM Corp. All Rights Reserved.
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

'use strict';

const log = require('winston');
const TwitterClient = require('twitter');
const Promise = require('bluebird');

const utilities = require('./utilities'),
  isNumericId = utilities.isNumericId,
  isInt = utilities.isInt;

const Credentials = require('./credentials');

const _ = require('underscore'),
  isNaN = _.isNaN,
  isString = _.isString,
  isArray  = _.isArray,
  extend   = _.extendOwn,
  contains = _.contains;

const MAX_COUNT = 200;

// Error codes
const RATE_LIMIT_EXCEEDED = 88;
const INVALID_OR_EXPIRED_TOKEN = 89;

// Error groups
const CRITICAL_ERRORS = [
    RATE_LIMIT_EXCEEDED,
    INVALID_OR_EXPIRED_TOKEN,
  ];

const KNOWN_ERRORS = [
  32
].concat(CRITICAL_ERRORS);

const errorCode = error =>
  error.code || (error[0] ? error[0].code : 0);


const knownError = (error) =>
  contains(KNOWN_ERRORS, errorCode(error));

const criticalError = error =>
  contains(CRITICAL_ERRORS, errorCode(error));

function errorMessage(error, client, method, api_url) {
  let message = (
    `lling '${api_url}' API [${method.toUpperCase()}]` +
    ` on twitter client nº ${client._instance_id}.`
  );

  if (errorCode(error) == 32 || criticalError(error)) {
    message += ` Error code: ${errorCode(error)}.`;
  }

  return message;
}


module.exports = class {

  constructor(credentials, options) {
    this.credentials = new Credentials(credentials);
    this.options = options || {};
    this.count = 0;
    this.clients = this.generateClients(this.credentials);
  }

  generateClient(credential, id) {
    const client = new TwitterClient(credential);
    client._instance_id = id;
    client._valid = true;
    return client;
  }

  generateClients(credentials) {
    return credentials.all().map((c, id) => this.generateClient(c, id))
  }

  nextClient() {
    const client_id = this.count % this.clients.length;
    this.count += 1;
    return this.clients[client_id];
  }

  getClient() {
    let client = this.nextClient();
    let attempt = 1;

    while (!client._valid && attempt <= this.clients.length) {
      attempt += 1;
      client = this.nextClient();
    }

    if (attempt > this.clients.length) {
      log.debug('No twitter credential available.');
      client = null;
    } else {
      log.debug(`Using twitter credentials nº ${client._instance_id}.`);
    }

    return client;
  }

  validateMethod(method) {
    if (!contains(['get', 'post'], method)) {
      throw new Error(`Method '${method}' not implemented.`);
    }
  }

  invalidateClient(error) {
    return criticalError(error);
  }

  handleError(client, err, method, api_url) {
    let message = errorMessage(err, client, method, api_url);

    if (this.invalidateClient(err)) {
      client._valid = false;
      client._error = err;
    }

    let promise;
    if (knownError(err)) {
      log.error(message, 'Using another twitter client', err);
      promise = Promise.resolve();
    } else {
      log.error(message, err);
      promise = Promise.reject(err);
    }
    return promise;
  }

  api(method, ...params) {
    const api_url = params[0];
    this.validateMethod(method);
    return new Promise((resolve, reject) => {
      const client = this.getClient();

      if (client) {

        const callback = (err, data) => {

          if (err) {
            this.handleError(client, err, method, api_url)
              .then(() => this.api(method, ...params))
              .then(resolve)
              .catch(reject);
          } else {
            resolve(data);
          }
        }

        client[method](...params.concat([callback]));

      } else {
          const message = 'All instances are invalid! Review your credentials';
          log.debug(message);
          reject(new Error(message));
      }

    });
  }

  get(...params) {
    return this.api('get', ...params);
  }

  post(...params) {
    return this.api('post', ...params);
  }

  tweetsLimit(limit, tweetsCount) {
    let newLimit;
    if (!limit) {
      newLimit = tweetsCount;
    } else {
      newLimit = tweetsCount < limit ? tweetsCount : limit;
    }
    return newLimit;
  }

  hasAtLeast(minTweets, tweetsCount) {
    return minTweets ? tweetsCount >= minTweets: true;
  }

  limitReached(limit, tweetsCount) {
    return limit ? tweetsCount > limit : false;
  }

  _getTweets (params, options, accumulatedTweets=[]) {
    return new Promise((resolve, reject) => {

      const crawl = (incomingTweets) => {
        if (incomingTweets.length > 0) {
          const user = incomingTweets[0].user;
          const tweetsCount = user.statuses_count;
          const limit = this.tweetsLimit(options.limit, tweetsCount);

          if (!this.hasAtLeast(options.min_tweets, tweetsCount)) {
            const message = (
              `Not enough tweets for user @${user.screen_name}: ` +
              `expected at least ${options.min_tweets} ` +
              `but user has ${tweetsCount} tweets (incl RT).`
            );
            log.error(message);
            reject(new Error(message));
          } else {
            log.debug(
              `Obtained ${incomingTweets.length} tweets ` +
              `for user @${user.screen_name}. Total collected ` +
              `tweets for @${user.screen_name}: ` +
              `${incomingTweets.length + accumulatedTweets.length}`
            );

            accumulatedTweets = accumulatedTweets.concat(incomingTweets);
            if ( incomingTweets.length > 1 && !this.limitReached(options.limit, accumulatedTweets.length) ) {
              this._getTweets(
                  extend(params, { max_id : incomingTweets[incomingTweets.length-1].id - 1 }),
                  options,
                  accumulatedTweets
                )
                .then(resolve)
                .catch(reject)
            } else {
              let outputTweets = accumulatedTweets;
              if (options.limit) {
                outputTweets = accumulatedTweets.slice(0, Math.min(options.limit, accumulatedTweets.length));
              }

              log.debug(
                `All tweets obtained for user @${user.screen_name}.`,
                `Total retrieved ${outputTweets.length}.`
              );

              //Check if we have enough tweets
              if (!this.hasAtLeast(options.min_tweets, outputTweets.length)) {
                const message = (
                  `Not enough tweets for user @${user.screen_name}: ` +
                  `expected at least ${options.min_tweets} ` +
                  `but user has ${tweetsCount} tweets.`
                );
                log.error(message);
                reject(new Error(message));
              }
              else {
                resolve(outputTweets);
              }
            }
          }
        } else {
          const outputTweets = accumulatedTweets;
          log.debug(
            `All tweets obtained for user ${params.screen_name ? '@' + params.screen_name : params.user_id}.`,
            `Total retrieved ${outputTweets.length}.`
          );

          //Check if we have enough tweets
          if (!this.hasAtLeast(options.min_tweets, outputTweets.length)) {
            const message = (
              `Not enough tweets for user @${user.screen_name}: ` +
              `expected at least ${options.min_tweets} ` +
              `but user has ${tweetsCount} tweets.`
            );
            log.error(message);
            reject(new Error(message));
          }
          else {
            resolve(outputTweets)
          }
        }

      };

      this.get('statuses/user_timeline', params)
        .then(crawl)
        .catch(reject);

    });
  }

  getTweets(params, options={}) {
    const _params = this.defaultParameters(params, {
      count: MAX_COUNT,
      exclude_replies: true,
      include_rts:false,
    });
    return this._getTweets(_params, options);
  }

  defaultParameters(params, defaults) {
    let _params;
    if (isString(params) || isNumericId(params)) {
      const userId = params;
      _params = isNumericId(userId)
        ? { user_id : userId }
        : { screen_name : userId.replace('@', '') };
    } else {
      _params = params;
    }
    return extend(defaults, _params);
  }

  getUser(params) {
    const _params = this.defaultParameters(params, {});
    return this.get('users/show', _params);
  }

}
