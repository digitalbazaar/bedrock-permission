# bedrock-permission

[![Build Status](http://ci.digitalbazaar.com/buildStatus/icon?job=bedrock-permission)](http://ci.digitalbazaar.com/job/bedrock-permission)

A [bedrock][] module that provides an API for managing access control to
resources via configurable permissions and roles. It is most commonly used
with the [bedrock-identity][] module.

## Requirements

- npm v3+

## Quick Examples

```
npm install bedrock-permission
```

The following example shows how to configure permissions and roles for
a system where an identity is assigned a role to grant it the permission
to edit other identities. Suppose the following permission and role are
configured:

```js
var config = require('bedrock').config;

var permissions = config.permission.permissions;
permissions.IDENTITY_EDIT = {
  id: 'IDENTITY_EDIT',
  label: 'Edit Identity',
  comment: 'Required to edit an Identity.'
};

var roles = config.permission.roles;
roles['identity.manager'] = {
  id: 'identity.manager',
  label: 'Identity Manager',
  comment: 'Role for managing identities.',
  sysPermission: ['IDENTITY_EDIT']
};
```

Now to test to see if an entity with the role `identity.manager`, that isn't
restricted to any particular resource, has the permission to edit any identity
we can do:

```js
var permission = require('bedrock-permission');

permission.createPermissionTable(
  [{sysRole:'identity.manager'}], function(err, table) {
  permission.checkPermission(table, 'IDENTITY_EDIT', function(err) {
    if(err) {
      console.log('permission denied');
    } else {
      console.log('permission granted');
    }
  });
});
```

To restrict a role to a particular resource and check against that resource
we can do:

```js
var permission = require('bedrock-permission');

permission.createPermissionTable([{
  sysRole:'identity.manager',
  resource: 'http://example.com/i/foo'
}], function(err, table) {
  permission.checkPermission(
    table, 'IDENTITY_EDIT', {resource: 'http://example.com/i/foo'},
    function(err) {
      if(err) {
        console.log('permission denied');
      } else {
        console.log('permission granted');
      }
    });
});
```

When using the [bedrock-identity][] module, roles will be stored in a
database for a particular identity and permission tables will be cached
and reused when checking a number of different permissions for the identity.

For example, suppose the `identity.manager` role is assigned to the identity
`http://example.com/i/member` for the identity `http://example.com/i/org`. This
models granting permission to a member of an organization to edit aspects
of that organization's identity. Actors that include a `sysPermissionTable` or
`sysResourceRole` may be passed to `permission.checkPermission`.

For example, the following [bedrock-identity][] API call can be used before
updating an identity:

```js
var brIdentity = require('bedrock-identity');

var PERMISSIONS = config.permission.permissions;
brIdentity.get(null, 'http://example.com/i/member', (err, actor) => {
  if(err) {
    // handle error ...
  }
  brIdentity.checkPermission(
    actor, PERMISSIONS.IDENTITY_EDIT,
    {resource: 'http://example.com/i/org'}, callback);
  // ...
});
```

A more complicated check could be made against resources the identity owns:

```js
var brIdentity = require('bedrock-identity');

var PERMISSIONS = config.permission.permissions;
brIdentity.get(null, 'http://example.com/i/member', (err, actor) => {
  if(err) {
    // handle error ...
  }
  var resource = {
    id: 'http://example.com/i/org/keys/1',
    owner: 'http://example.com/i/org'
  };
  brIdentity.checkPermission(
    actor, PERMISSIONS.IDENTITY_EDIT,
    {resource: resource, translate: 'owner'}, callback);
  // ...
});
```

## How It Works

### Overview

The permission system is driven by configuration options and an API. The
permission configuration defines roles and permissions. The API allows
checks on permissions.

### Permissions

A permission refers to an action or class of actions that can be taken in
Bedrock. Permissions have identifiers and meta information associated
with them such as descriptions for what the permissions are for. The permission
system's API is only concerned with permission identifiers. Permissions are
used to control resources. Permissions may be aggregated under what is referred
to as a role.

### Roles

A role is a collection of permissions. An association between a role and a
set of resource identifiers is referred to as a resource role. Resource roles
can be assigned to identities in order to grant identities certain permissions
for particular resources. In its simplest form a resource role grants all of the
permissions in its role for all of the resource identifiers it lists. However,
resource access control can be further abstracted via the API. When checking
to see if an identity has been granted a particular permission for a resource,
the API allows translation functions to be given that can use other properties
of the resource to determine which resource identifiers should be checked
against the permission.

For example, an identity may have a resource role that contains the permission
to edit a resource, R. When code is written for editing that resource, the
permission API may be used to check to see if the acting identity (the
identity attempting the edit) has been granted the permission to edit the
resource. However, it could alternatively be implemented to instead check
the resource's "owner" property and use the identifier it finds there instead
when running the permission check. This, in effect, means that if the identity
has been granted permission to edit a resource R, it can edit any resources
that R owns (via the code that is using the permission API in this way).

### Permission Table

When checking a permission, the permission API requires a permission table.
This table is created by processing a set of resource roles. For each
resource role, all of the permissions are saved in the table and mapped
either to the value 'true' if the permissions are granted for all resources,
or mapped to another table of resource identifiers that are themselves mapped
to the value 'true'.

### Actor

In [bedrock][], the typical usage pattern for checking permissions occurs when
an actor attempts to perform an action on a resource. An actor is any identity
as defined via [bedrock-identity][]. In order to check to see if an actor has a
permission to act on a resource, it may be passed to the `checkPermission` API,
provided that its `sysResourceRole` or `sysPermissionTable` has been set.

The [bedrock-identity][] `get` API will create and cache the retrieved
identity's (aka actor) permission table. When this actor is passed to the
`checkPermission` API, it will check the table to see if a particular
permission exists. If it does, and the actor is granted the permission for all
resources, the permission check succeeds. Otherwise, if a resource or set of
resources has been given to the API, these must be checked. In order to check
resources, first a translate function, if given, is applied to determine which
identifiers should be looked for in the table for the given resources. This
translation can be arbitrary; the default behavior is to use the identifiers
for the resources themselves. There are some built-in options that allow
different properties of the resources (eg: 'owner') to be scanned to find
alternative identifiers. If a look up of the resource is necessary to check
those properties, a custom function may be provided to obtain that information
during identifier translation.

Once the identifiers for the resources have been determined, they are checked
against the actor's permission table as well. If they exist, the permission
check will pass, if not, it will fail. There are variants of this where
options to the API may specify that only one must pass or they must all
pass, etc.


[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-identity]: https://github.com/digitalbazaar/bedrock-identity
