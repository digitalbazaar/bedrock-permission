/*
 * Copyright (c) 2016-2018 Digital Bazaar, Inc. All rights reserved.
 */
/* jshint node: true */

'use strict';

const helpers = require('./helpers');

const data = {};
module.exports = data;

const identities = data.identities = {};
let username;

// FIXME: use new bedrock-identity format
username = 'adminUser';
identities[username] = {};
identities[username].identity = helpers.createIdentity(username);
identities[username].identity.sysResourceRole.push({
  sysRole: 'bedrock-permission.all'
});

username = 'noRemoveRoleUser';
identities[username] = {};
identities[username].identity = helpers.createIdentity(username);
identities[username].identity.sysResourceRole.push({
  sysRole: 'bedrock-permission.noRemoveRole'
});

username = 'noPermission';
identities[username] = {};
identities[username].identity = helpers.createIdentity(username);

username = 'simplePermissionSelf';
identities[username] = {};
identities[username].identity = helpers.createIdentity(username);
identities[username].identity.sysResourceRole.push({
  sysRole: 'bedrock-permission.simple',
  resource: [identities[username].identity.id]
});

username = 'simplePermissionSomeResource';
identities[username] = {};
identities[username].identity = helpers.createIdentity(username);
identities[username].identity.sysResourceRole.push({
  sysRole: 'bedrock-permission.simple',
  resource: ['some-resource']
});
