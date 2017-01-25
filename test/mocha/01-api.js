/*
 * Copyright (c) 2016-2017 Digital Bazaar, Inc. All rights reserved.
 */
/* globals should */
const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const brIdentity = require('bedrock-identity');
const brPermission = require('bedrock-permission');
const helpers = require('./helpers');
const mockData = require('./mock.data');

const { permissions } = config.permission;

describe('bedrock-permission', () => {
  before(done => {
    helpers.prepareDatabase(mockData, done);
  });
  describe('removeRole', () => {
    describe('admin user with ROLE_REMOVE permission', () => {
      const actorId = mockData.identities.adminUser.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should mark a role as deleted', done => {
        const role = {
          label: 'someLabel',
          comment: 'someComment',
          sysPermission: [permissions.ROLE_ACCESS.id]
        };
        async.auto({
          addRole: callback => {
            brPermission.addRole(null, role, callback);
          },
          removeRole: ['addRole', (callback, results) => {
            const id = results.addRole.role.id;
            brPermission.removeRole(actor, id, callback);
          }],
          getRole: ['removeRole', (callback, results) => {
            brPermission.getRole(null, results.addRole.role.id, (err, result) => {
              should.not.exist(err);
              result.sysStatus.should.equal('deleted');
              callback();
            });
          }]
        }, done);
      });
    });
    describe('admin user without ROLE_REMOVE permission', () => {
      const actorId = mockData.identities.noRemoveRoleUser.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should return PermissionDenied', done => {
        const role = {
          label: 'someLabel',
          comment: 'someComment',
          sysPermission: [permissions.ROLE_ACCESS.id]
        };
        async.auto({
          addRole: callback => {
            brPermission.addRole(null, role, callback);
          },
          removeRole: ['addRole', (callback, results) => {
            const id = results.addRole.role.id;
            brPermission.removeRole(actor, id, (err) => {
              should.exist(err);
              err.name.should.equal('PermissionDenied');
              err.details.sysPermission.should.equal('ROLE_REMOVE');
              callback();
            });
          }],
          getRole: ['removeRole', (callback, results) => {
            brPermission.getRole(null, results.addRole.role.id, (err, result) => {
              should.not.exist(result.sysStatus);
              callback();
            });
          }]
        }, done);
      });
    });
  });

  describe('checkPermission', () => {
    describe('user without any TEST_PERMISSION_SIMPLE capability', () => {
      const actorId = mockData.identities.noPermission.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should return PermissionDenied', done => {
        brPermission.checkPermission(
          actor, permissions.TEST_PERMISSION_SIMPLE,
          {resource: 'other'}, err => {
            should.exist(err);
            err.name.should.equal('PermissionDenied');
            err.details.sysPermission.should.equal('TEST_PERMISSION_SIMPLE');
            done();
          });
      });
    });

    describe('user with `TEST_PERMISSION_SIMPLE + some-resource` capability', () => {
      const actorId = mockData.identities.simplePermissionSomeResource.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should pass permission check', done => {
        brPermission.checkPermission(
          actor, permissions.TEST_PERMISSION_SIMPLE,
          {resource: 'some-resource'}, err => {
            should.not.exist(err);
            done();
          });
      });
    });

    describe('user with `TEST_PERMISSION_SIMPLE + self` capability and translate function', () => {
      const actorId = mockData.identities.simplePermissionSelf.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should pass permission check', done => {
        brPermission.checkPermission(
          actor, permissions.TEST_PERMISSION_SIMPLE, {
            resource: {id: 'some-resource', owner: actorId},
            translate: 'owner'
          }, err => {
            should.not.exist(err);
            done();
          });
      });
    });

    describe('user with `TEST_PERMISSION_SIMPLE + some-resource` capability and translate function', () => {
      const actorId = mockData.identities.simplePermissionSomeResource.identity.id;
      let actor;
      before(done => {
        brIdentity.get(null, actorId, (err, result) => {
          actor = result;
          done();
        });
      });
      it('should pass permission check', done => {
        brPermission.checkPermission(
          actor, permissions.TEST_PERMISSION_SIMPLE, {
            resource: {id: 'some-resource', owner: actorId},
            translate: 'owner'
          }, err => {
            should.not.exist(err);
            done();
          });
      });
    });
  });
});
