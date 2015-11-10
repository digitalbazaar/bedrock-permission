# bedrock-permission ChangeLog

## [Unreleased]

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

[Unreleased]: https://github.com/digitalbazaar/bedrock-permission/compare/1.1.0...HEAD
[1.1.0]: https://github.com/digitalbazaar/bedrock-permission/compare/1.0.1...1.1.0
[1.0.1]: https://github.com/digitalbazaar/bedrock-permission/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/digitalbazaar/bedrock-permission/compare/0.1.0...1.0.0
