/*
 * Bedrock Permission Module Configuration
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

config.permission = config.permission || {};
config.permission.permissions = config.permission.permissions || {};
config.permission.roles = config.permission.roles || {};

// permissions
var permissions = config.permission.permissions;
permissions.ROLE_ACCESS = {
  id: 'ROLE_ACCESS',
  label: 'Access Role',
  comment: 'Required to access a Role.'
};
permissions.ROLE_CREATE = {
  id: 'ROLE_CREATE',
  label: 'Create Role',
  comment: 'Required to create a Role.'
};
permissions.ROLE_REMOVE = {
  id: 'ROLE_REMOVE',
  label: 'Remove Role',
  comment: 'Required to remove a Role.'
};
permissions.ROLE_UPDATE = {
  id: 'ROLE_UPDATE',
  label: 'Update Role',
  comment: 'Required to update a Role.'
};
