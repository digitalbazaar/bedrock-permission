/*
 * Copyright (c) 2012-2020 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');

config.permission = config.permission || {};
config.permission.permissions = config.permission.permissions || {};
config.permission.roles = config.permission.roles || {};
config.permission.roleBaseUrl = '';

// permissions
const {permissions} = config.permission;
permissions.PERMISSION_ADMIN = {
  id: 'PERMISSION_ADMIN',
  label: 'Access All Permissions',
  comment: 'Required to access all permissions.'
};
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
