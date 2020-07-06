/*
 * Copyright (c) 2016-2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const helpers = require('./helpers');

const data = {};
module.exports = data;

const accounts = data.accounts = {};
let username;

// FIXME: use new bedrock-account format
username = 'adminUser';
accounts[username] = {};
accounts[username].account = helpers.createAccount(username);
accounts[username].meta = {
  sysResourceRole: [{
    sysRole: 'bedrock-permission.all'
  }]
};

username = 'noRemoveRoleUser';
accounts[username] = {};
accounts[username].account = helpers.createAccount(username);
accounts[username].meta = {
  sysResourceRole: [{
    sysRole: 'bedrock-permission.noRemoveRole'
  }]
};

username = 'noPermission';
accounts[username] = {};
accounts[username].account = helpers.createAccount(username);
accounts[username].meta = {};

username = 'simplePermissionSelf';
accounts[username] = {};
accounts[username].account = helpers.createAccount(username);
accounts[username].meta = {
  sysResourceRole: [{
    sysRole: 'bedrock-permission.simple',
    resource: [accounts[username].account.id]
  }]
};

username = 'simplePermissionSomeResource';
accounts[username] = {};
accounts[username].account = helpers.createAccount(username);
accounts[username].meta = {
  sysResourceRole: [{
    sysRole: 'bedrock-permission.simple',
    resource: ['some-resource']
  }]
};
