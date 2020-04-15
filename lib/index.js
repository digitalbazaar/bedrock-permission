/*
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */

'use strict';

// FIXME: this is because _checkPermission is not at the top of the file
/* eslint-disable no-use-before-define */

const _ = require('lodash');
const bedrock = require('bedrock');
const {config, util: {callbackify: brCallbackify, uuid}} = bedrock;
const database = require('bedrock-mongodb');
const {promisify} = require('util');
const {BedrockError} = bedrock.util;

let PERMISSIONS;
let mongodbReady = false;

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app').child('bedrock-permission');

bedrock.events.on('bedrock.init', () => {
  if(config.permission.roleBaseUrl.length !== 0) {
    Object.keys(config.permission.roles).forEach(function(role) {
      if(config.permission.roles[role].id.indexOf(':') !== -1) {
        return;
      }
      config.permission.roles[role].id =
        config.permission.roleBaseUrl + '/' +
        encodeURIComponent(config.permission.roles[role].id);
    });
  }
  // log permissions
  const {permissions} = bedrock.config.permission;
  Object.keys(permissions).forEach(function(permission) {
    logger.debug('adding permission', permissions[permission]);
  });
});

bedrock.events.on('bedrock-mongodb.ready', async () => {
  PERMISSIONS = bedrock.config.permission.permissions;

  await promisify(database.openCollections)(['role']);

  await promisify(database.createIndexes)([{
    collection: 'role',
    fields: {id: 1},
    options: {unique: true, background: false}
  }]);

  const {roles} = bedrock.config.permission;
  for(const role of Object.values(roles)) {
    role.permanent = true;
    logger.debug('adding role', role);
    // TODO: update API to use named parameters
    try {
      await api.addRole(null, role);
    } catch(e) {
      // TODO: update API to throw `DuplicateError` BedrockError
      if(!database.isDuplicateError(e)) {
        throw e;
      }
    }
  }

  mongodbReady = true;
});

/**
 * Returns all available permissions.
 *
 * @param actor the Identity performing the action.
 * @param callback(err, permissions) Called once the operation completes.
 */
api.getPermissions = brCallbackify(async actor => {
  await _checkPermission(actor, PERMISSIONS.PERMISSION_ADMIN);
  return PERMISSIONS;
});

/**
 * Returns a role based on the id.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the role.
 * @param callback(err, role) Called once the operation completes.
 */
api.getRole = brCallbackify(async (actor, id) => {
  if(!mongodbReady) {
    // Stopgap if someone requests a role before mongo has been initialized
    // Just return default role from the config
    return bedrock.config.permission.roles[id];
  }

  await _checkPermission(actor, PERMISSIONS.ROLE_ACCESS);

  const record = await database.collections.role.findOne(
    {id: database.hash(id)});
  if(!record) {
    throw new BedrockError(
      'Failed to find role.', 'NotFound', {
        httpStatusCode: 404,
        public: true
      });
  }

  return record.role;
});

/**
 * Returns all roles in the database.
 *
 * @param actor the Identity performing the action.
 * @param callback(err, roles) Called once the operation completes.
 */
api.getRoles = brCallbackify(async actor => {
  if(!mongodbReady) {
    // Stopgap if someone requests a role before mongo has been initialized
    // Just return default roles in the config
    const {roles} = bedrock.config.permission;
    return Object.values(roles);
  }

  await _checkPermission(actor, PERMISSIONS.ROLE_ACCESS);

  // TODO: optimize with projection
  const records = await database.collections.role.find({}).toArray();
  return records.map(record => record.role);
});

/**
 * Adds a new role to the database.
 *
 * @param actor the Identity performing the action.
 * @param role the new role to add.
 * @param callback(err, record) Called once the operation completes.
 */
api.addRole = brCallbackify(async (actor, role) => {
  role.id = role.id || uuid();
  if(role.id.indexOf(':') === -1 &&
    config.permission.roleBaseUrl.length !== 0) {
    role.id = config.permission.roleBaseUrl + '/' + encodeURIComponent(role.id);
  }
  const now = Date.now();
  const record = {
    id: database.hash(role.id),
    role,
    meta: {
      created: now,
      updated: now
    }
  };

  await _checkPermission(actor, PERMISSIONS.ROLE_CREATE);
  const result = await database.collections.role.insert(
    record, database.writeOptions);
  return result.ops[0];
});

/**
 * Updates a role in the database.
 *
 * @param actor the Identity performing the action.
 * @param role the role to update.
 * @param callback(err, role) Called once the operation completes.
 */
api.updateRole = brCallbackify(async (actor, role) => {
  // TODO: update API to use patch and sequence
  await _checkPermission(actor, PERMISSIONS.ROLE_UPDATE);
  await database.collections.role.update(
    {id: database.hash(role.id)}, {$set: {role}}, database.writeOptions);
  return role;
});

/**
 * Marks a role as deleted in the database.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the role to mark as deleted.
 * @param callback(err) called once the operation completes.
 */
api.removeRole = brCallbackify(async (actor, id) => {
  await _checkPermission(actor, PERMISSIONS.ROLE_REMOVE);
  await database.collections.role.update({
    id: database.hash(id)
  }, {
    // TODO: use `meta.status`
    $set: {'role.sysStatus': 'deleted'}
  }, database.writeOptions);
});

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
api.createPermissionTable = brCallbackify(async resourceRoles => {
  const results = await api.getRoles(null);

  // TODO: implement this as a database query
  const roles = {};
  results
    .filter(role => role.sysStatus !== 'deleted')
    .forEach(role => roles[role.id] = role);
  const table = {};
  for(const resourceRole of resourceRoles) {
    if(resourceRole.sysRole in roles) {
      for(let permission of roles[resourceRole.sysRole].sysPermission) {
        if(typeof permission === 'object') {
          permission = permission.id;
        }
        if(!resourceRole.resource) {
          table[permission] = true;
        } else if(!table[permission] || typeof table[permission] === 'object') {
          let {resource} = resourceRole;
          if(!Array.isArray(resource)) {
            resource = [resource];
          }
          if(!table[permission]) {
            table[permission] = {};
          }
          resource.forEach(id => table[permission][id] = true);
        }
      }
    }
  }
  return table;
});

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
 *          [translate](permission, options, callback(err, identifiers)) either
 *            a function to map the resources given in `options` to a list of
 *            identifiers to check instead, or an array of properties to obtain
 *            the identifiers for any resources that are objects; if the
 *            identifiers var returned is an empty array, null, or undefined,
 *            then the permission check will fail.
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
  if(callback) {
    return _checkPermission(
      tableOrActor, permission, options, (err, result) => {
        if(result === undefined) {
          return callback(err);
        }
        callback(err, result);
      });
  }
  return _checkPermission(tableOrActor, permission, options);
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
  return _checkActorPermission(actor, permission, options, callback);
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
  return async (permission, options) => {
    // get resources to check and normalize to an array
    let resources = options.resource || options.or || options.and;
    if(!Array.isArray(resources)) {
      resources = [resources];
    }

    let hasId = (properties.indexOf('id') !== -1);
    if(!hasId && !options.excludeId && !options.and) {
      properties.push('id');
      hasId = true;
    }
    const identifiers = [];

    // process each resource
    for(let resource of resources) {
      // TODO: support default identifiers for properties?
      // populate resource if necessary
      if(options.get &&
        // id is missing or more than one property: get resources OR...
        ((typeof resource === 'string' && (!hasId || properties.length > 1)) ||
        // properties is not a subset of resource object: get resources
        (bedrock.util.isObject(resource) &&
        _.intersection(Object.keys(resource), properties).length !==
        properties.length))) {
        let getFn = options.get;
        if(options.get.length === 3) {
          getFn = promisify(options.get);
        }
        try {
          resource = await getFn(resource, options);
        } catch(e) {
          throw new BedrockError(
            'Permission denied; resource does not contain the ' +
            'required properties.',
            'PermissionDenied',
            {public: true}, e);
        }
      }
      identifiers.push(...translate(resource));
    }

    return identifiers;

    // translates a resource to a list of identifiers and adds them
    function translate(resource) {
      let ids = [];

      // pick out identifiers from resource properties
      if(bedrock.util.isObject(resource)) {
        // pick out values for the given properties, flatten them to
        // a single array, and convert objects to their identifiers
        let values = _.flatten(_.values(_.pick(resource, properties)));
        values = values.map(x => {
          if(typeof x === 'string') {
            return x;
          }
          if(bedrock.util.isObject(x)) {
            return x.id || null;
          }
          return null;
        });
        // filter values to valid IDs (remove any nulls)
        ids = _.filter(values, x => x !== null);
      } else if(typeof resource === 'string' && hasId) {
        ids.push(resource);
      }

      if(ids.length === 0) {
        throw new BedrockError(
          'Permission denied; resource does not contain the ' +
          'required properties.',
          'PermissionDenied',
          {public: true, httpStatusCode: 403});
      }

      return ids;
    }
  };
};

/**
 * Helper function that only checks for the 'id' property in resources.
 */
api.resourceToIdentifier = api.resourceToPropertyIdentifier('id');

/**
 * Expands the given resource roles to URLs as needed.
 *
 * @param resourceRoles the resource roles to operate on.
 *
 * @return the same `resourceRoles` parameter, now with expanded roles.
 */
api.expandRoles = resourceRoles => {
  if(!(config.permission.roleBaseUrl.length !== 0 && resourceRoles)) {
    return resourceRoles;
  }

  for(const role of resourceRoles) {
    if(role.sysRole.indexOf(':') !== -1) {
      continue;
    }
    role.sysRole = config.permission.roleBaseUrl + '/' +
      encodeURIComponent(role.sysRole);
  }

  return resourceRoles;
};

/**
 * Merges resource roles (capabilities) into the given resource roles.
 *
 * @param addList the list of roles to add.
 */
api.mergeCapabilities = (resourceRoles, addList) => {
  for(const toAdd of addList) {
    let added = false;
    for(const existing of resourceRoles) {
      if(!(existing.sysRole === toAdd.sysRole &&
        !!existing.resource === !!toAdd.resource)) {
        // not a match
        continue;
      }

      // match found
      added = true;
      if(toAdd.resource) {
        existing.resource = _.uniq(existing.resource.concat(toAdd.resource));
      }
      break;
    }
    if(!added) {
      resourceRoles.push(toAdd);
    }
  }
  return resourceRoles;
};

/**
 * Subtracts resource roles (capabilities) from the given resource roles.
 *
 * @param removalList the list of resource roles to substract.
 */
api.subtractCapabilities = (resourceRoles, removalList) => {
  for(const toRemove of removalList) {
    resourceRoles = resourceRoles.filter(existing => {
      if(existing.sysRole !== toRemove.sysRole) {
        // role does not match, keep it
        return true;
      }

      // request is to remove blanket "any" resource capability (where no
      // targeted `resource` list specified)
      if(!toRemove.resource) {
        // remove `existing` capability if it has no `resource` list
        return !!existing.resource;
      }

      // otherwise, request is to remove capabilities for specific resources
      if(!existing.resource) {
        // `existing` capability is a blanket one, so keep it
        return true;
      }

      // keep resources that do not match the removal list
      existing.resource = existing.resource.filter(
        resource => !toRemove.resource.includes(resource));
      // keep capability if it has a non-empty resource list
      return existing.resource.length > 0;
    });
  }
  return resourceRoles;
};

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

// TODO: use named params, split `tableOrActor` into `table` and `actor`
const _checkPermission = brCallbackify(async (
  tableOrActor, permission, options = {}) => {
  // use permission ID if full permission given
  if(typeof permission === 'object') {
    permission = permission.id;
  }

  if(tableOrActor === null || tableOrActor === undefined ||
    (typeof tableOrActor === 'object' &&
    (tableOrActor.sysResourceRole || tableOrActor.sysPermissionTable))) {
    return _checkActorPermission(tableOrActor, permission, options);
  }

  // tableOrActor must be a table
  if(typeof tableOrActor !== 'object') {
    throw new TypeError('tableOrActor must an object.');
  }

  // options don't matter, permission granted for all resources
  if(tableOrActor[permission] === true) {
    return options.returnIds ? [] : undefined;
  }

  // permission denied; general permission not given and no resources passed
  if(!options.resource && !options.or && !options.and) {
    throw _resourcePermissionError(permission, 'Permission denied.');
  }

  // identifier map must exist if resources given
  if(typeof tableOrActor[permission] !== 'object') {
    throw _resourcePermissionError(permission);
  }

  // translate resources to a list of identifiers
  let translate = options.translate || api.resourceToIdentifier;
  if(typeof translate !== 'function') {
    translate = api.resourceToPropertyIdentifier(translate);
  } else if(translate.length === 3) {
    translate = promisify(translate);
  }

  // normalize identifiers to an array
  let identifiers = await translate(permission, options) || [];
  if(!Array.isArray(identifiers)) {
    identifiers = [identifiers];
  }

  const passed = [];
  for(const identifier of identifiers) {
    if(tableOrActor[permission][identifier]) {
      passed.push(identifier);
    } else if(options.and) {
      // all identifiers must pass
      throw _resourcePermissionError(permission);
    }
  }

  if(passed.length > 0) {
    return options.returnIds ? passed : undefined;
  }

  throw _resourcePermissionError(permission);
});

// TODO: use named params
const _checkActorPermission = brCallbackify(async (
  actor, permission, options) => {
  // actor is undefined, deny permission
  if(typeof actor === 'undefined') {
    throw new BedrockError(
      'Permission denied; no actor specified.',
      'PermissionDenied', {public: true});
  }

  // grant permission; actor is null (NOT undefined) (full admin mode)
  if(actor === null) {
    return options.returnIds ? [] : undefined;
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

  // create and cache table
  if(!actor.sysPermissionTable) {
    actor.sysPermissionTable = await api.createPermissionTable(
      actor.sysResourceRole || []);
  }

  return _checkPermission(actor.sysPermissionTable, permission, options);
});
