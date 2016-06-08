# bedrock-permission ChangeLog

## Unreleased

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
