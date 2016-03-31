# NodeJS Twitter Crawler

![last-release](https://img.shields.io/github/tag/ibm-silvergate/nodejs-twitter-crawler.svg)
[![npm-version](https://img.shields.io/npm/v/nodejs-twitter-crawler.svg)](https://www.npmjs.com/package/nodejs-twitter-crawler)
[![npm-license](https://img.shields.io/npm/l/nodejs-twitter-crawler.svg)](https://www.npmjs.com/package/nodejs-twitter-crawler)
[![npm-downloads](https://img.shields.io/npm/dm/nodejs-twitter-crawler.svg)](https://www.npmjs.com/package/nodejs-twitter-crawler)

Crawl twitter users and user tweets but using multiple credentials. Credentials
used in a round-robin mode.

## Using the component

NodeJS Twitter Crawler is implemented using promises. You will need to use promises
pattern no add callbacks to crawler method invocations.

```JavaScript
var crawler = new TwitterCrawler(credentials);

crawler.getUser(/* CrawlerParameters */)
  .then( /* Success Callback */ )
  .catch( /* Error Callback */ )

crawler.getTweets(/* CrawlerParameters */, { limit: /* Desired limit, you can omit this */ })
  .then( /* Success Callback */ )
  .catch( /* Error Callback */ )
```

## API Methods

The available methods are the following ones:
  - `getUser   :: CrawlerParameters -> Promise` - Obtain the user status from Twitter by calling `users/show` method from Twitter API. The `then` callback will receive the user information.
  - `getTweets :: (CrawlerParameters[, CrawlerOptions]) -> Promise` - Obtain User Tweets by calling `statuses/user_timeline` method from Twitter API. The `then` callback will receive a list of tweets.


Definitions
  - `CrawlerParameters` can be a `TwitterID` or a `TwitterParameters` object.
  - `TwitterID` is the numeric Twitter ID or the Twitter Handle.
  - `TwitterParameters` is an object with parameters to be passed to Twitter API. E.g. [this documentation](https://dev.twitter.com/rest/reference/get/statuses/user_timeline) shows that `GET statuses/user_timeline` can receive parameters such as `user_id` or `exclude_replies`.
  - `Promise` is a promise as defined by [BlueBird package](https://www.npmjs.com/package/bluebird).
  - `CrawlerOptions` is an object containing options for the crawling with attributes:
    - `limit`: sets the max count of tweets to collect.
    - `min_tweets`: forces a minimum tweet count. If set and not satisfied, it will result in rejection. 
