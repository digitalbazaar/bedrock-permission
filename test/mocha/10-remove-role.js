/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
/* globals should */
var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var brIdentity = require('bedrock-identity');
var brPermission = require('bedrock-permission');
var helpers = require('./helpers');
var mockData = require('./mock.data');

var permissions = config.permission.permissions;

describe('bedrock-permission removeRole', () => {
  before(done => {
    helpers.prepareDatabase(mockData, done);
  });
  describe('admin user with ROLE_REMOVE permission', () => {
    var actorId = mockData.identities.adminUser.identity.id;
    var actor;
    before(done => {
      brIdentity.get(null, actorId, (err, result) => {
        actor = result;
        done();
      });
    });
    it('should mark a role as deleted', done => {
      var role = {
        label: 'someLabel',
        comment: 'someComment',
        sysPermission: [permissions.ROLE_ACCESS.id]
      };
      async.auto({
        addRole: callback => {
          brPermission.addRole(null, role, callback);
        },
        removeRole: ['addRole', (callback, results) => {
          var id = results.addRole.role.id;
          brPermission.removeRole(actor, id, callback);
        }],
        getRole: ['removeRole', (callback, results) => {
          brPermission.getRole(null, results.addRole.role.id, (err, result) => {
            result.sysStatus.should.equal('deleted');
            callback();
          });
        }]
      }, done);
    });
  });
  describe('admin user without ROLE_REMOVE permission', () => {
    var actorId = mockData.identities.noRemoveUser.identity.id;
    var actor;
    before(done => {
      brIdentity.get(null, actorId, (err, result) => {
        actor = result;
        done();
      });
    });
    it('should return PermissionDenied', done => {
      var role = {
        label: 'someLabel',
        comment: 'someComment',
        sysPermission: [permissions.ROLE_ACCESS.id]
      };
      async.auto({
        addRole: callback => {
          brPermission.addRole(null, role, callback);
        },
        removeRole: ['addRole', (callback, results) => {
          var id = results.addRole.role.id;
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
