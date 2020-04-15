/*
 * Copyright (c) 2016-2017 Digital Bazaar, Inc. All rights reserved.
 */
const config = require('bedrock').config;
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

// MongoDB
config.mongodb.name = 'bedrock_permission_test';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'bedrock_permission_test';
config.mongodb.username = 'bedrock';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;
config.mongodb.dropCollections.onInit = true;
config.mongodb.dropCollections.collections = [];

const {permissions, roles} = config.permission;

roles['bedrock-permission.all'] = {
  id: 'bedrock-permission.all',
  label: 'Permission Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.ROLE_ACCESS.id,
    permissions.ROLE_CREATE.id,
    permissions.ROLE_REMOVE.id,
    permissions.ROLE_UPDATE.id
  ]
};

roles['bedrock-permission.noRemove'] = {
  id: 'bedrock-permission.noRemove',
  label: 'Permission Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.ROLE_ACCESS.id,
    permissions.ROLE_CREATE.id,
    permissions.ROLE_UPDATE.id
  ]
};

permissions.TEST_PERMISSION_SIMPLE = {
  id: 'TEST_PERMISSION_SIMPLE',
  label: 'Test Permission',
  comment: 'Used to test permissions.'
};
roles['bedrock-permission.simple'] = {
  id: 'bedrock-permission.simple',
  label: 'Permission Test Role',
  comment: 'Role for Test User',
  sysPermission: [
    permissions.TEST_PERMISSION_SIMPLE
  ]
};
