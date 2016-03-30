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

crawler.getUser(/* User ID */)
  .then( /* Success Callback */ )
  .catch( /* Error Callback */ )

crawler.getTweets(/* User ID */, { limit: /* Desired limit, you can omit this */ })
  .then( /* Success Callback */ )
  .catch( /* Error Callback */ )
```

## API Methods

The available methods are the following ones:
  - `getUser   :: TwitterID -> Promise` - Obtain the user status from Twitter by calling `users/show` method from Twitter API. The `then` callback will receive the user information.
  - `getTweets :: (TwitterID[, CrawlerOptions]) -> Promise` - Obtain User Tweets by calling `statuses/user_timeline` method from Twitter API. The `then` callback will receive a list of tweets.


Definitions
  - `TwitterID` is the numeric Twitter ID or the Twitter Handle.
  - `Promise` is a promise as defined by [BlueBird package](https://www.npmjs.com/package/bluebird).
