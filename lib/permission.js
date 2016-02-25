/*
 * Bedrock permission module.
 *
 * Copyright (c) 2012-2016 Digital Bazaar, Inc. All rights reserved.
 */
/* jshint node: true */
'use strict';

var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var BedrockError = bedrock.util.BedrockError;
var database = require('bedrock-mongodb');
var uuid = require('node-uuid').v4;

var PERMISSIONS;
var mongodbReady = false;

// load config defaults
require('./config');

// module API
var api = {};
module.exports = api;

var logger = bedrock.loggers.get('app');

bedrock.events.on('bedrock.init', function() {
  // log permissions
  var permissions = bedrock.config.permission.permissions;
  Object.keys(permissions).forEach(function(permission) {
    logger.debug('adding permission', permissions[permission]);
  });
});

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  PERMISSIONS = bedrock.config.permission.permissions;
  async.auto({
    openCollections: function(callback) {
      database.openCollections(['roles'], callback);
    },
    createIndexes: ['openCollections', function(callback) {
      database.createIndexes([{
        collection: 'roles',
        fields: {id: 1},
        options: {unique: true, background: false}
      }], callback);
    }],
    addRoles: ['createIndexes', function(callback) {
      async.eachSeries(
        bedrock.config.permission.roles, function(role, callback) {
        role.permanent = true;
        logger.debug('adding role', role);
        api.addRole(null, role, function(err) {
          if(err && database.isDuplicateError(err)) {
            err = null;
          }
          callback(err);
        });
      }, function(err) {
        if(!err) {
          mongodbReady = true;
        }
        callback(err);
      });
    }]
  }, callback);
});

/**
 * Returns a role based on the id.
 *
 * @param actor the Identity performing the action.
 * @param id The id of the role.
 * @param callback(err, role) Called once the operation completes.
 */
api.getRole = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      api.checkPermission(actor, PERMISSIONS.ROLE_ACCESS, callback);
    },
    function(callback) {
      var q = {id: database.hash(id)};
      database.collections.roles.findOne(q, function(err, result) {
        if(!result) {
          return callback(new BedrockError(
            'Failed to find role.', 'NotFound', {
            httpStatusCode: 404,
            public: true
          }));
        }
        callback(err, result.role);
      });
    }
  ], callback);
};

/**
 * Returns all roles in the database.
 *
 * @param actor the Identity performing the action.
 * @param callback(err, roles) Called once the operation completes.
 */
api.getRoles = function(actor, callback) {
  if(!mongodbReady) {
    // Stopgap if someone requests a role before mongo has been initialized
    // Just return default roles in the config
    var roles = bedrock.config.permission.roles;
    return callback(null, _.values(roles));
  }
  async.waterfall([
    function(callback) {
      api.checkPermission(actor, PERMISSIONS.ROLE_ACCESS, callback);
    },
    function(callback) {
      database.collections.roles.find({}).toArray(function(err, results) {
        if(err) {
          return callback(err);
        }
        callback(null, _.map(results, 'role'));
      });
    }
  ], callback);
};

/**
 * Adds a new role to the database.
 *
 * @param actor the Identity performing the action.
 * @param role The new role to add.
 * @param callback(err, role) Called once the operation completes.
 */
api.addRole = function(actor, role, callback) {
  role.id = role.id || uuid();
  var now = Date.now();
  var record = {
    id: database.hash(role.id),
    role: role,
    meta: {
      created: now,
      updated: now
    }
  };
  async.waterfall([
    function(callback) {
      api.checkPermission(actor, PERMISSIONS.ROLE_CREATE, callback);
    },
    function(callback) {
      database.collections.roles.insert(
        record, database.writeOptions, function(err, result) {
          if(err) {
            return callback(err);
          }
          callback(null, result.ops[0]);
        });
    }
  ], callback);
};

/**
 * Updates a role in the database.
 *
 * @param callback(err, roles) Called once the operation completes.
 */
api.updateRole = function(actor, role, callback) {
  async.waterfall([
    function(callback) {
      api.checkPermission(actor, PERMISSIONS.ROLE_UPDATE, callback);
    },
    function(callback) {
      database.collections.roles.update(
        {id: database.hash(role.id)}, {$set: {role: role}},
        database.writeOptions, function(err, result) {
          if(err) {
            return callback(err);
          }
          callback(null, role);
        });
    }
  ], callback);
};

/**
 * Removes a role in the database.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the role to delete.
 * @param callback(err, result) Called once the operation completes.
 */
api.removeRole = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      api.checkPermission(actor, PERMISSIONS.ROLE_REMOVE, callback);
    },
    function(callback) {
      database.collections.roles.deleteOne({id: database.hash(id)}, callback);
    }
  ], callback);
};

/**
 * Creates a permission table using the given ResourceRole. A permission table
 * maps permissions and resource identifiers to true/undefined values and can
 * be used for quick look ups to determine if a particular permission is
 * granted for a particular resource.
 *
 * A ResourceRole is the combination of a Role and a set of resource
 * identifiers, eg:
 *
 * [{
 *   sysRole: 'admin',
 *   resource: ['https://example.com/i/foo']
 * }]
 *
 * If no resource is specified, then the role applies to all resources.
 * Resource identifiers are usually Identity IDs and are used to aggregate
 * permission checks on owned resources, but special cases may involve
 * IDs for other types of resources.
 *
 * @param resourceRoles the ResourceRoles to use.
 * @param callback(err, table) called once the operation completes.
 */
api.createPermissionTable = function(resourceRoles, callback) {
  api.getRoles(null, function(err, results) {
    if(err) {
      return callback(err);
    }
    // TODO: implement this as a database query
    var roles = {};
    results.forEach(function(role) {
      roles[role.id] = role;
    });
    var table = {};
    resourceRoles.forEach(function(resourceRole) {
      if(resourceRole.sysRole in roles) {
        roles[resourceRole.sysRole].sysPermission.forEach(function(permission) {
          if(typeof permission === 'object') {
            permission = permission.id;
          }
          if(!resourceRole.resource) {
            table[permission] = true;
          } else if(!table[permission] ||
            typeof table[permission] === 'object') {
            var resource = resourceRole.resource;
            if(!Array.isArray(resource)) {
              resource = [resource];
            }
            if(!table[permission]) {
              table[permission] = {};
            }
            resource.forEach(function(id) {
              table[permission][id] = true;
            });
          }
        });
      }
    });
    callback(null, table);
  });
};

/**
 * Checks an actor or a permission table to see if the given permission(s) are
 * granted. Permission may also be checked against a particular resource or a
 * set of resources.
 *
 * A permission table usually belongs to an 'actor'; that actor is typically
 * attempting to perform an action on some resource(s). Permission can be
 * checked against one or more resources, which may be the resources (or
 * their identifiers) themselves, or they may be the product of some
 * higher-level abstraction. For example, permissions for certain resources may
 * be implemented by testing to see if a permission is granted for the entity
 * that owns those resource(s). This approach allows common actions to be
 * aggregated and simplifies permission checks.
 *
 * By default, any resources given will be checked against the permission
 * table, however, a 'translate' function may be provided to convert those
 * resources into another set of identifiers to check instead. If translate
 * is given as an array of properties, then the resources will be translated
 * using the 'resourceToPropertyIdentifier' translation function. Note that
 * in this case, the 'id' property will be added automatically if the 'and'
 * option is not used, unless the 'excludeId' option is set to true.
 *
 * If the permission check passes, then an array of identifiers that passed
 * the check will be returned in the callback, otherwise an error will be
 * raised.
 *
 * @param tableOrActor the permission table or actor to check, if null,
 *          or contains a `sysResourceRole` or `sysPermissionTable` property,
 *          it will be considered an actor, not a table.
 * @param permission the permission to check.
 * @param options the options to use.
 *          [actor] the owner of the permission table.
 *          [returnIds] true to return the identifiers that were checked
 *            and passed the check in the callback, false or omit not to.
 *          [resource] the resource to check.
 *          [or] a list of resources to check where, if any pass the check,
 *            an error is not raised.
 *          [and] a list of resources to check where, if any do not pass the
 *            check, an error is raised.
 *          [translate](resources, options, callback(err, identifiers)) either
 *            a function to map the given resources to a list of identifiers to
 *            check instead, or an array of properties to obtain the
 *            identifiers for any resources that are objects; if the identifiers
 *            var returned is an empty array, null, or undefined, then the
 *            permission check will fail.
 *          [excludeId] true to exclude the 'id' property when translating
 *            resource IDs.
 *          [get](resource, callback) a function used to populate a resource
 *            if it is missing any of the translate properties.
 * @param callback(err, [identifiers]) called once the operation completes.
 */
api.checkPermission = function(tableOrActor, permission, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  if(tableOrActor !== null && typeof tableOrActor !== 'object') {
    throw new TypeError('tableOrActor must be null or an object.');
  }

  // use permission ID if full permission given
  if(typeof permission === 'object') {
    permission = permission.id;
  }

  if(tableOrActor === null ||
    tableOrActor.sysResourceRole || tableOrActor.sysPermissionTable) {
    // tableOrActor is an actor
    return api.checkActorPermission(
      tableOrActor, permission, options, callback);
  }

  // options don't matter, permission granted for all resources
  if(tableOrActor[permission] === true) {
    if(options.returnIds) {
      return callback(null, []);
    }
    return callback(null);
  }

  // permission denied; general permission not given and no resources passed
  if(!options.resource && !options.or && !options.and) {
    return callback(_resourcePermissionError(permission, 'Permission denied.'));
  }

  // identifier map must exist if resources given
  if(typeof tableOrActor[permission] !== 'object') {
    return callback(_resourcePermissionError(permission));
  }

  async.auto({
    translate: function(callback) {
      // translate resources to a list of identifiers
      var translate = options.translate || api.resourceToIdentifier;
      if(typeof translate !== 'function') {
        translate = api.resourceToPropertyIdentifier(translate);
      }
      translate(permission, options, callback);
    },
    check: ['translate', function(callback, results) {
      var identifiers = results.translate;
      if(!identifiers) {
        identifiers = [];
      } else if(!Array.isArray(identifiers)) {
        identifiers = [identifiers];
      }
      var passed = [];
      for(var i = 0; i < identifiers.length; ++i) {
        if(tableOrActor[permission][identifiers[i]]) {
          passed.push(identifiers[i]);
        } else if(options.and) {
          // all identifiers must pass
          return callback(_resourcePermissionError(permission));
        }
      }
      if(passed.length > 0) {
        return callback(null, passed);
      }
      callback(_resourcePermissionError(permission));
    }]
  }, function(err, results) {
    if(options.returnIds) {
      return callback(err, results.check);
    }
    callback(err);
  });
};

/**
 * Checks to see if an actor has been granted a permission to some resource.
 * This method is a passthrough to this module's `checkPermission` call, but
 * it takes an actor instead of a permission table, and it will create and
 * cache the actor's permission table as needed. If the actor is null or
 * undefined, permission will be granted. Otherwise, it must be an object that
 * contains the `sysResourceRole` property that defines the actor's roles or
 * a `sysPermissionTable` property from a previously cached permission table.
 *
 * @param actor the that wants to act, if null or undefined is given,
 *          permission will be granted.
 * @param permission the permission to check.
 * @param options the options to use, see: checkPermission.
 * @param callback(err, [identifiers]) called once the operation completes.
 */
api.checkActorPermission = function(actor, permission, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  // actor is undefined, deny permission
  if(typeof actor === 'undefined') {
    return callback(new BedrockError(
      'Permission denied; no actor specified.',
      'PermissionDenied', {public: true}));
  }

  // grant permission; actor is null (NOT undefined) (full admin mode)
  if(actor === null) {
    if(options.returnIds) {
      return callback(null, []);
    }
    return callback(null);
  }

  // actor must be an object at this point
  if(typeof actor !== 'object') {
    throw new TypeError(
      'actor must be an object; got "' + typeof actor + '" instead.');
  }

  // TODO: including the actor in the options doesn't seem to be the cleanest
  // design

  // include actor in options
  if(!('actor' in options)) {
    options.actor = actor;
  }

  async.auto({
    cacheTable: function(callback) {
      // table already cached
      if(actor.sysPermissionTable) {
        return callback(null, actor.sysPermissionTable);
      }
      api.createPermissionTable(actor.sysResourceRole || [], callback);
    },
    checkPermission: ['cacheTable', function(callback, results) {
      actor.sysPermissionTable = results.cacheTable;
      api.checkPermission(
        actor.sysPermissionTable, permission, options, callback);
    }]
  }, function(err, results) {
    if(options.returnIds) {
      return callback(err, results.checkPermission);
    }
    callback(err);
  });
};

/**
 * Creates an identifier translator function that translates resources to
 * an array of identifiers found via certain properties in each resource. If
 * any resource is only its identifier (it is a string) and the 'id' property
 * is in the list of properties, then it will be used as the 'id' value. If the
 * 'id' property was not given, an error will be raised. The 'id' property is
 * automatically added to the list of properties if not given and the 'and'
 * option was not used; to exclude it pass the 'excludeId' option as true
 * when checking permissions.
 *
 * @param properties the list of properties to use (can be a single property).
 *
 * @return the identifier translator function for use with 'checkPermission',
 */
api.resourceToPropertyIdentifier = function(properties) {
  // flatten and normalize properties to an array
  properties = _.flatten(arguments);
  return function(permission, options, callback) {
    // get resources to check
    var resources = options.resource || options.or || options.and;

    // normalize to array
    if(!Array.isArray(resources)) {
      resources = [resources];
    }
    var hasId = (properties.indexOf('id') !== -1);
    if(!hasId && !options.excludeId && !options.and) {
      properties.push('id');
      hasId = true;
    }
    var identifiers = [];

    // process each resource
    return async.each(resources, function(resource, next) {
      // TODO: support default identifiers for properties?
      // populate resource if necessary
      if(options.get &&
        ((typeof resource === 'string' && (!hasId || properties.length > 1)) ||
        (bedrock.util.isObject(resource) &&
        _.intersection(Object.keys(resource), properties).length !==
        properties.length))) {
        return options.get(resource, options, function(err, resource) {
          if(err) {
            return next(new BedrockError(
              'Permission denied; resource does not contain the ' +
              'required properties.',
              'PermissionDenied',
              {public: true}, err));
          }
          translate(resource, next);
        });
      }
      // no population needed
      translate(resource, next);
    }, function(err) {
      callback(err, identifiers);
    });

    // translates a resource to a list of identifiers and adds them
    function translate(resource, callback) {
      var ids = [];

      // pick out identifiers from resource properties
      if(bedrock.util.isObject(resource)) {
        // pick out values for the given properties, flatten them to
        // a single array, and convert objects to their identifiers
        var values = _.flatten(_.values(_.pick(resource, properties)));
        values = values.map(function(x) {
          if(typeof x === 'string') {
            return x;
          }
          if(bedrock.util.isObject(x)) {
            return x.id || null;
          }
          return null;
        });
        // filter values to valid IDs (remove any nulls)
        ids = _.filter(values, function(x) {
          return x !== null;
        });
      } else if(typeof resource === 'string' && hasId) {
        ids.push(resource);
      }

      if(ids.length === 0) {
        return callback(new BedrockError(
          'Permission denied; resource does not contain the ' +
          'required properties.',
          'PermissionDenied',
          {public: true, httpStatusCode: 403}));
      }
      identifiers.push.apply(identifiers, ids);
      callback();
    }
  };
};

/**
 * Helper function that only checks for the 'id' property in resources.
 */
api.resourceToIdentifier = api.resourceToPropertyIdentifier('id');

/**
 * Helper function to generate a resource permission error.
 *
 * @param permission the permission that failed.
 * @param message optional custom error message.
 *
 * @return a resource permission error.
 */
function _resourcePermissionError(permission, message) {
  message = (message ||
    'Permission to interact with the given resource(s) has been denied.');
  return new BedrockError(
    message, 'PermissionDenied',
    {sysPermission: permission, public: true, httpStatusCode: 403});
}
