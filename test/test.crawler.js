/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

const assert = require('chai').assert;
const getEnvCredentials = require('./utilities').getEnvCredentials;
const TwitterCrawler = require('../lib/twitter-crawler');
const log = require('winston');

describe('crawler', () => {

  it('crawl user with twitter handle', () => {
    const crawler = new TwitterCrawler(getEnvCredentials());

    return crawler.getUser('ladygaga')
      .then(user => assert.equal(user.screen_name, 'ladygaga', 'Obtained user'));
  });

  it('crawl user with twitter ID', () => {
    const crawler = new TwitterCrawler(getEnvCredentials());

    return crawler.getUser('19397785')
      .then(user => assert.equal(user.screen_name, 'Oprah', 'Obtained user'));
  });

  it('crawl tweets with twitter handle and limit', () => {
    const crawler = new TwitterCrawler(getEnvCredentials());
    return crawler.getTweets('ladygaga', { limit: 300 })
      .then(tweets => assert.equal(tweets.length, 300, 'Obtained tweets with upper limit'));
  });

  it('crawl tweets with twitter ID and limit', () => {
    const crawler = new TwitterCrawler(getEnvCredentials());
    return crawler.getTweets('19397785', { min_tweets : 1, limit: 50 })
      .then(tweets => assert.equal(tweets.length, 50, 'Obtained tweets with upper limit'));
  });

  it('crawl tweets with parameters', () => {
    const crawler = new TwitterCrawler(getEnvCredentials());
    return crawler.getTweets({
      screen_name : 'ladygaga',
      count : 151,
      exclude_replies : false,
      include_rts : true
    }, { limit: 30 })
      .then(tweets => assert.equal(tweets.length, 30, 'Obtained tweets with upper limit'));
  });

});
