###
# Copyright 2015 IBM Corp. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###


TwitterClient = require 'twitter'
Promise = require 'promise'
_extend = require('extend')
extend = (objects...) -> _extend(true, objects...)


MAX_COUNT = 200

getLogger = (debug) ->
  info : console.info.bind(console),
  error : console.error.bind(console),
  debug : if debug then console.info.bind(console) else (->)

isInt = (value) ->
  !isNaN(value) and parseInt(Number(value)) == value and not isNaN(parseInt(value, 10))

class TwitterCrawler

  constructor: (credentials, options = {}) ->
    this.setOptions(options)
    this.logger = getLogger(this.options.debug)
    this.count = 0
    this.createClients(credentials)

  createClients: (credentials) ->
    this.clients = []
    credentials.forEach (credential) =>
      if credential.enabled?
        client = new TwitterClient(credential)
        client._instance_id = this.clients.length
        this.clients.push(client)

  setOptions: (options) ->
    this.options = extend({
        debug : false
      }, options)

  getInstance: ->
    instanceIndex = this.count % this.clients.length
    this.count++
    this.logger.debug('Using twitter credentials nº' + instanceIndex);
    this.clients[instanceIndex]

  callApi: (method, args...) ->
    if not (method in ['get', 'post'])
      throw new Error 'Method \'' + method + '\' not implemented.'

    new Promise (resolve, reject) =>
        instance = this.getInstance()

        callback = (err, data) =>
          if err
            errorMessage = 'Error calling \'' + args[0] + '\' api ' +
              '['+ method.toUpperCase() + '] on instance ' + instance._instance_id + '.'

            if err.code == 32 || (err[0] && err[0].code == 32)
              # Try again with a different instance
              this.logger.error errorMessage, 'Using another instance.', err
              this.callApi(method, args...)
            else
              # Abort
              this.logger.error errorMessage, err
              reject err
          else
            resolve data

        instance[method](args.concat([callback])...)

  get: (args...) ->
    this.callApi('get', args...)

  post: (args...) ->
    this.callApi('post', args...)

  _getTweets: (params, options, accumulatedTweets = []) ->
    # Performs tweets crawling
    new Promise (resolve, reject) =>
      # Crawler function
      crawler = (incomingTweets) =>
        this.logger.debug(
            'Obtained', incomingTweets.length, 'for userId',
            params.user_id + '.', 'Total tweets for user:',
            incomingTweets.length + accumulatedTweets.length
          )
        limitReached = options.limit and (accumulatedTweets.length + incomingTweets.length) > options.limit
        if incomingTweets.length > 1 and not limitReached
          # Got tweets? Let's see if there more out there
          this._getTweets(
              extend(params, maxId : incomingTweets[incomingTweets.length-1].id - 1),
              options
              accumulatedTweets.concat(incomingTweets)
            ).done(resolve, reject)
        else
          output = accumulatedTweets.concat(incomingTweets)
          if options.limit
            output = output[0..options.limit]
          resolve output

      # Get tweets
      this.get('statuses/user_timeline', params)
        .done(crawler, reject)

  getTweets: (userId, options = {}) ->
    params =
      user_id: (userId if isInt userId)
      screen_name: (userId.replace('@', '') if not (isInt userId))
      count: MAX_COUNT
      exclude_replies: true
      trim_user: true
      maxId: undefined
    this._getTweets params, options

  getUser: (userId) ->
    params =
      user_id: (userId if isInt userId)
      screen_name: (userId.replace('@', '') if not (isInt userId))

    this.get('users/show', params)

module.exports = TwitterCrawler
