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
_extend = require('extend')
extend = (objects...) -> _extend(true, objects...)


MAX_COUNT = 200
logger = console


class TwitterCrawler

  constructor: (credentials) ->
    this.count = 0
    this.clients = []
    credentials.forEach (credential) =>
      if credential.enabled?
        client = new TwitterClient(credential)
        client._instance_id = this.clients.length
        this.clients.push(client)

  getInstance: ->
    instanceIndex = this.count % this.clients.length
    this.count++
    this.clients[instanceIndex]

  callApi: (method, args...) ->
    if not (method in ['get', 'post'])
      throw new Error 'Method \'' + method + '\' not implemented.'

    new Promise (resolve, reject) =>
        instance = this.getInstance()

        callback = (err, data) =>
          if err
            errorMessage = 'Error calling \'' + parameters[0] + '\' api ' +
              '['+ method.toUpperCase() + '] on instance ' + instance._instance_id + '.'

            if err.code == 32 || err[0].code == 32
              # Try again with a different instance
              logger.error errorMessage, 'Using another instance.', err
              this.callApi(method, args...)
            else
              # Abort
              reject err
          else
            resolve data

        instance[method](args.concat([callback])...)

  get: (args...) ->
    this.callApi('get', args...)

  post: (args...) ->
    this.callApi('post', args...)

  _getTweets: (params, accumulatedTweets = []) ->
    # Performs tweets crawling
    new Promise (resolve, reject) =>
      # Crawler function
      crawler = (incomingTweets) =>
        if incomingTweets.length > 1
          # Got tweets? Let's see if there more out there
          this._getTweets(
              extend(params, maxId : incomingTweets[-1].id -1),
              accumulatedTweets.concat(incomingTweets)
            ).done(resolve, reject)
        else
          resolve accumulatedTweets.concat(incomingTweets)
      # Get tweets
      this.get('statuses/user_timeline', params)
        .done(crawler, reject)

  getTweets: (userId) ->
    params =
      user_id: userId
      count: MAX_COUNT
      exclude_replies: true
      trim_user: true
      maxId: undefined
    this._getTweets params

  getUser: (userId) ->
    this.get('users/show', { user_id: userId })

module.exports = TwitterCrawler
