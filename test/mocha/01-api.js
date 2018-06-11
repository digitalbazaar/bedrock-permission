/*
 * Copyright (c) 2016-2018 Digital Bazaar, Inc. All rights reserved.
 */
/* globals should */
const bedrock = require('bedrock');
const {config} = bedrock;
const brPermission = require('bedrock-permission');
const helpers = require('./helpers');
const mockData = require('./mock.data');
const {promisify} = require('util');
const {permissions} = config.permission;
let actors;

describe('bedrock-permission', () => {
  before(async () => {
    await helpers.prepareDatabase(mockData);
    actors = await helpers.getActors(mockData);
  });
  describe('removeRole', () => {
    describe('admin user with ROLE_REMOVE permission', () => {
      it('should mark a role as deleted', async () => {
        const role = {
          label: 'someLabel',
          comment: 'someComment',
          sysPermission: [permissions.ROLE_ACCESS.id]
        };
        const {role: {id}} = await brPermission.addRole(null, role);
        await brPermission.removeRole(actors.adminUser, id);
        const result = await brPermission.getRole(null, id);
        result.sysStatus.should.equal('deleted');
      });
    });
    describe('admin user without ROLE_REMOVE permission', () => {
      it('should return PermissionDenied', async () => {
        const role = {
          label: 'someLabel',
          comment: 'someComment',
          sysPermission: [permissions.ROLE_ACCESS.id]
        };
        const {role: {id}} = await brPermission.addRole(null, role);

        let err;
        try {
          await brPermission.removeRole(actors.noRemoveRoleUser, id);
        } catch(e) {
          err = e;
        }
        should.exist(err);
        err.name.should.equal('PermissionDenied');
        err.details.sysPermission.should.equal('ROLE_REMOVE');

        const result = await brPermission.getRole(null, id);
        should.not.exist(result.sysStatus);
      });
    });
  });

  describe('checkPermission', () => {
    describe('user without any TEST_PERMISSION_SIMPLE capability', () => {
      it('should return PermissionDenied', async () => {
        // FIXME: remove extra promisify once new API is in place
        const checkPermission = promisify(brPermission.checkPermission);
        let err;
        try {
          await checkPermission(
            actors.noPermission, permissions.TEST_PERMISSION_SIMPLE,
            {resource: 'other'});
        } catch(e) {
          err = e;
        }
        should.exist(err);
        err.name.should.equal('PermissionDenied');
        err.details.sysPermission.should.equal('TEST_PERMISSION_SIMPLE');
      });
    });

    describe('user with `TEST_PERMISSION_SIMPLE + some-resource` capability',
      () => {
      // FIXME: remove extra promisify once new API is in place
      const checkPermission = promisify(brPermission.checkPermission);
      it('should pass permission check', async () => {
        await checkPermission(
          actors.simplePermissionSomeResource,
          permissions.TEST_PERMISSION_SIMPLE,
          {resource: 'some-resource'});
      });
    });

    describe(
      'user with `TEST_PERMISSION_SIMPLE + self` capability and ' +
      'translate function', () => {
      // FIXME: remove extra promisify once new API is in place
      const checkPermission = promisify(brPermission.checkPermission);
      it('should pass permission check', async () => {
        await checkPermission(
          actors.simplePermissionSelf, permissions.TEST_PERMISSION_SIMPLE, {
            resource: {
              id: 'some-resource',
              owner: actors.simplePermissionSelf.id
            },
            translate: 'owner'
          });
      });
    });

    describe(
      'user with `TEST_PERMISSION_SIMPLE + some-resource` capability ' +
      'and translate function', () => {
      // FIXME: remove extra promisify once new API is in place
      const checkPermission = promisify(brPermission.checkPermission);
      it('should pass permission check', async () => {
        await checkPermission(
          actors.simplePermissionSomeResource,
          permissions.TEST_PERMISSION_SIMPLE, {
            resource: {
              id: 'some-resource',
              owner: actors.simplePermissionSomeResource.id
            },
            translate: 'owner'
          });
      });
    });
  });
});
