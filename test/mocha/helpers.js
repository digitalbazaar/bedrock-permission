/*
 * Copyright (c) 2016-2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const brIdentity = require('bedrock-identity');
const database = require('bedrock-mongodb');
const {promisify} = require('util');
const {util: {uuid}} = require('bedrock');

const api = {};
module.exports = api;

api.createIdentity = userName => {
  const newIdentity = {
    id: 'did:' + uuid(),
    label: userName,
    email: userName + '@bedrock.dev',
    url: 'https://example.com',
    description: userName
  };
  return newIdentity;
};

api.getActors = async mockData => {
  const actors = {};
  for(const [key, record] of Object.entries(mockData.identities)) {
    actors[key] = await brIdentity.getCapabilities({id: record.identity.id});
  }
  return actors;
};

api.removeCollections = async (collectionNames = ['identity']) => {
  await promisify(database.openCollections)(collectionNames);
  for(const collectionName of collectionNames) {
    await database.collections[collectionName].deleteMany({});
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
  for(const record of records) {
    try {
      await brIdentity.insert(
        {actor: null, identity: record.identity, meta: record.meta || {}});
    } catch(e) {
      if(e.name === 'DuplicateError') {
        // duplicate error means test data is already loaded
        continue;
      }
      throw e;
    }
  }
}
