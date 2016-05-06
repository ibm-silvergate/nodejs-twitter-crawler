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

var
  TwitterCrawler = require('../dist/nodejs-twitter-crawler'),
  credentials = [
    {
      consumer_key : "<consumer_key>",
      consumer_secret : "<consumer_secret>",
      access_token_key : "<access_token_key>",
      access_token_secret : "<access_token_secret>",
      enabled : true
    }
  ],
  fs = require('fs');

function bind(object, method) {
  return object[method].bind(object)
}

function saveOutput(obj, filename) {
  fs.writeFile( __dirname + '/output/' + filename, JSON.stringify(obj, null, '  ') );
}


var
  crawler = new TwitterCrawler(credentials, { debug: true }),
  crawlList = [
      'ladygaga',
      '19397785',
      'KingJames'
    ];


crawlList.forEach(function(twitterHandle) {
  // Get user
  console.info('Obtaining user with id '+twitterHandle+'...');
  crawler.getUser(twitterHandle)
    .then(function (user) {
      console.info('Obtained info for user', user.name, '(' + user.id + '). Storing in output/'+ twitterHandle +'_user.json');
      saveOutput(user, twitterHandle + '_user.json');

      // Crawl tweets
      console.info('Obtaining tweets...');
      crawler.getTweets(twitterHandle, { limit : 1000 })
        .then(function (tweets) {
          console.info('Obtained', tweets.length, 'tweets for user', user.name, '(' + user.id + '). Storing in output/'+ twitterHandle +'_tweets.json');
          saveOutput(tweets, twitterHandle + '_tweets.json');
          console.info('Crawling finished.');
        })
        .catch(bind(console, 'error'));
    })
    .catch(bind(console, 'error'));
});
