/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

const TwitterCrawler = require('../lib/twitter-crawler');
const fs = require('fs');
const log = require('winston');
const Promise = require('bluebird');

const getEnvCredentials = () =>
  process.env.TWITTER_CREDENTIALS ? JSON.parse(process.env.TWITTER_CREDENTIALS) : [];

const credentials = [
    {
      consumer_key : "<consumer_key>",
      consumer_secret : "<consumer_secret>",
      access_token_key : "<access_token_key>",
      access_token_secret : "<access_token_secret>",
      enabled : false
    }
  ].concat(getEnvCredentials());


const bind = (object, method) => object[method].bind(object);

function saveOutput(obj, filename) {
  fs.writeFile(`${__dirname}/output/${filename}`, JSON.stringify(obj, null, '  '));
}


const crawler = new TwitterCrawler(credentials);
const crawlList = [
  'ladygaga',
  '19397785',
  'KingJames'
];


module.exports = Promise.all(crawlList.map((twitterHandle) => {
  // Get user
  log.info(`Obtaining user with id ${twitterHandle}...`);
  return crawler.getUser(twitterHandle)
    .then((user) => {
      log.info(
        `Obtained info for user ${user.name} (${user.id}). ` +
        `Storing in output/${twitterHandle}_user.json`
      );

      saveOutput(user, `${twitterHandle}_user.json`);

      // Crawl tweets
      log.info('Obtaining tweets...');
      return crawler.getTweets(twitterHandle, { min_tweets: 50, limit : 300 })
        .then((tweets) => {
          log.info(
            `Obtained ${tweets.length} tweets for user ${user.name} (${user.id}). ` +
            `Storing in output/${twitterHandle}_tweets.json`
          );

          saveOutput(tweets, `${twitterHandle}_tweets.json`);
          log.info('Crawling finished.');
        });
    })
    .catch(bind(log, 'error'));
}));
