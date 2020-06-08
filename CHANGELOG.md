# bedrock-permission ChangeLog

## 3.0.0 -

### Changed
- **BREAKING**: Upgrade `bedrock-mongodb` to ^7.0.0.
- Change mongo APIs to conform to mongo driver 3.5.

# 2.5.4 - 2019-11-12

### Changed
- Update dependencies.

# 2.5.3 - 2018-09-14

## Fixed
- Fix `checkPermission` to function properly with callback and promises.

## 2.5.2 - 2018-09-13

### Fixed
- Fix issue where callback would not be invoked when result argument was
   `undefined`.

## 2.5.1 - 2018-08-19

### Fixed
- Fix bug so promise is returned from `checkPermission` and
  `checkActorPermission`.

## 2.5.0 - 2018-06-14

### Added
- Add `expandRoles`, `mergeCapabilities`, and `subtractCapabilities`
  utility functions.

## 2.4.5 - 2018-06-12

### Changed
- Clean up internals to use async+await, etc.

## 2.4.4 - 2018-03-26

### Changed
- Update `bedrock-mongodb` peer dependency.
- Update test dependencies.

## 2.4.3 - 2017-02-09

### Changed
- Added tests.
- Replace `node-uuid` dependency with `uuid`.

## 2.4.2 - 2016-10-31

### Fixed
- Actor checking in checkPermission API.

## 2.4.1 - 2016-10-10

### Changed
- Make removeRole API mark roles as `deleted`.

## 2.4.0 - 2016-09-29

### Added
- Support for roles that are marked as deleted.

## 2.3.2 - 2016-06-07

### Changed
- Update dependencies.

## 2.3.1 - 2016-05-25

### Fixed
- Fix collection name typo.

## 2.3.0 - 2016-04-28

### Added
- Add getPermissions API.

## 2.2.0 - 2016-04-26

### Added
- Use URLs for role ids.

## 2.1.0 - 2016-04-22

### Added
- Add role API.

## 2.0.1 - 2016-04-15

### Changed
- Update bedrock dependencies.

## 2.0.0 - 2016-03-02

### Changed
- Update package dependencies for npm v3 compatibility.

## 1.1.1 - 2016-02-05

### Changed
- Replace underscore with lodash.
- Type check actor.

## 1.1.0 - 2015-11-10

### Added

- `checkActorPermission` call to check the permission of an `actor`; an
  `actor` must specify a `sysResourceRole` property with its roles and then
  its permission table will be generated and cached from them.
- `checkPermission` now accepts an `actor` or a permission table as its first
  parameter.

## 1.0.1 - 2015-05-07

## 1.0.0 - 2015-04-08

### Changed
- Use `bedrock.start` since no special privileges required.

## 0.1.0 (up to early 2015)

- See git history for changes.
