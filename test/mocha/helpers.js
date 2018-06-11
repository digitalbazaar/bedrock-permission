/*
 * Copyright (c) 2016-2018 Digital Bazaar, Inc. All rights reserved.
 */
/* jshint node: true */
'use strict';

// FIXME: update to use new bedrock-identity API
const brIdentity = require('bedrock-identity');
const database = require('bedrock-mongodb');
const {promisify} = require('util');
const uuid = require('uuid/v4');

const api = {};
module.exports = api;

api.createIdentity = userName => {
  const newIdentity = {
    id: 'did:' + uuid(),
    type: 'Identity',
    sysSlug: userName,
    label: userName,
    email: userName + '@bedrock.dev',
    sysPassword: 'password',
    sysPublic: ['label', 'url', 'description'],
    sysResourceRole: [],
    url: 'https://example.com',
    description: userName,
    sysStatus: 'active'
  };
  return newIdentity;
};

api.getActors = async mockData => {
  const actors = {};
  const getFn = promisify(brIdentity.get);
  for(const [key, record] of Object.entries(mockData.identities)) {
    actors[key] = await getFn(null, record.identity.id);
  }
  return actors;
};

api.removeCollections = async (collectionNames = ['identity']) => {
  await promisify(database.openCollections)(collectionNames);
  for(const collectionName of collectionNames) {
    await database.collections[collectionName].remove({});
  }
};

api.removeCollection =
  async collectionName => api.removeCollections([collectionName]);

api.prepareDatabase = async mockData => {
  await api.removeCollections();
  await insertTestData(mockData);
};

async function insertTestData(mockData) {
  const records = Object.values(mockData.identities);
  // FIXME: use new bedrock-identity API
  const insertFn = promisify(brIdentity.insert);
  for(const record of records) {
    try {
      await insertFn(null, record.identity);
    } catch(e) {
      // FIXME: use new bedrock-identity API
      //if(e.name === 'DuplicateError') {
      if(!database.isDuplicateError(e)) {
        // duplicate error means test data is already loaded
        continue;
      }
      throw e;
    }
  }
}
