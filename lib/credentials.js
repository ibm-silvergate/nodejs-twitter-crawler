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

const _ = require('underscore'),
  isNaN = _.isNaN,
  isString = _.isString,
  isArray  = _.isArray,
  isObject = _.isObject,
  extend   = _.extendOwn,
  keys     = _.keys,
  isUndefined = _.isUndefined;

module.exports = class {

  constructor(credentials) {
    this._credentials = this.sanitize(credentials);

  }

  isEnabled(c) {
    return isUndefined(c.enabled) || c.enabled;
  }

  enabled(credentials) {
    return credentials.filter(this.isEnabled);
  }

  all() {
    return this.enabled(this._credentials);
  }

  validType(credentials) {
    return isArray(credentials) || isObject(credentials);
  }

  validateCredential(credential, i) {
    const fields = {'consumer_key': false, 'consumer_secret': false, 'access_token_key': true, 'access_token_secret': true};

    keys(fields).forEach((field) => {
      if (credential[field]) {
        if (!isString(credential[field])) {
          throw new Error(`Field '${field}' on credential nº ${i} must be a string`);
        }
      } else {
        if (fields[field]) {
          throw new Error(`Missing field '${field}' on credential nº ${i}`);
        }
      }
    });
  }

  validateCredentials(credentials) {
    credentials.forEach(this.validateCredential);
  }

  hasEnabledCredentials(credentials) {
    return this.enabled(credentials).length > 0;
  }

  sanitize(credentials) {
    if (isUndefined(credentials))
      throw new Error('You must provide credentials');

    if (!this.validType(credentials))
      throw new Error('You must provide a single set of credentials or an array of credentials');

    const _credentials = isArray(credentials) ? credentials : [credentials];

    this.validateCredentials(_credentials);

    if (!this.hasEnabledCredentials(_credentials)) {
      throw new Error('All your credentials are marked as disabled');
    }

    return _credentials;
  }

};
