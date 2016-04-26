# bedrock-permission ChangeLog

## [Unreleased]

## [2.2.0] - 2016-04-26

### Added
- Use URLs for role ids.

## [2.1.0] - 2016-04-22

### Added
- Add role API.

## [2.0.1] - 2016-04-15

### Changed
- Update bedrock dependencies.

## [2.0.0] - 2016-03-02

### Changed
- Update package dependencies for npm v3 compatibility.

## [1.1.1] - 2016-02-05

### Changed
- Replace underscore with lodash.
- Type check actor.

## [1.1.0] - 2015-11-10

### Added

- `checkActorPermission` call to check the permission of an `actor`; an
  `actor` must specify a `sysResourceRole` property with its roles and then
  its permission table will be generated and cached from them.
- `checkPermission` now accepts an `actor` or a permission table as its first
  parameter.

## [1.0.1] - 2015-05-07

## [1.0.0] - 2015-04-08

### Changed
- Use `bedrock.start` since no special privileges required.

## 0.1.0 (up to early 2015)

- See git history for changes.

[Unreleased]: https://github.com/digitalbazaar/bedrock-permission/compare/2.2.0...HEAD
[2.2.0]: https://github.com/digitalbazaar/bedrock-permission/compare/2.1.0...2.2.0
[2.1.0]: https://github.com/digitalbazaar/bedrock-permission/compare/2.0.1...2.1.0
[2.0.1]: https://github.com/digitalbazaar/bedrock-permission/compare/2.0.0...2.0.1
[2.0.0]: https://github.com/digitalbazaar/bedrock-permission/compare/1.1.1...2.0.0
[1.1.1]: https://github.com/digitalbazaar/bedrock-permission/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/digitalbazaar/bedrock-permission/compare/1.0.1...1.1.0
[1.0.1]: https://github.com/digitalbazaar/bedrock-permission/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/digitalbazaar/bedrock-permission/compare/0.1.0...1.0.0
