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
const Credentials = require('../lib/credentials');
const log = require('winston');
const isArray = require('underscore').isArray;

describe('credentials', () => {

  it('credentials available', (done) => {
    const credentials = new Credentials(getEnvCredentials());
    assert.isAtLeast(credentials.all().length, 1, 'Valid credentials present in environment variable \'$TWITTER_CREDENTIALS\'');
    done();
  });

  it('credentials as list', (done) => {
    const env_credentials = getEnvCredentials();
    const credentials = new Credentials(isArray(env_credentials) ? env_credentials : [env_credentials]);
    assert.isAtLeast(credentials.all().length, 1, 'Valid credentials present in environment variable \'$TWITTER_CREDENTIALS\'');
    done();
  });

  it('credentials as object', (done) => {
    const env_credentials = getEnvCredentials();
    const credentials = new Credentials(isArray(env_credentials) ? env_credentials[0] : env_credentials);
    assert.isAtLeast(credentials.all().length, 1, 'Valid credentials present in environment variable \'$TWITTER_CREDENTIALS\'');
    done();
  });

});
