/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

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

var permissions = config.permission.permissions;
var roles = config.permission.roles;

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
