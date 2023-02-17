# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2022-02-17

### Added

- Node version minimal requirements upgraded from 12.x to 14.x.
- Upgraded aws-sdk, eslint, mocha, serverless, typescript and some other packages.
- npm bin changed to npx because of first command's deprecation.

## [3.0.0] - 2022-02-03

### Added

- Moved the plugin and tests to TypeScript.
- Moved from istanbul to nyc.

## [2.0.0] - 2022-02-03

### Added

- Added support of Serverless Framework 3.
- Moved from Travis CI to Github Actions.
- Added integration tests.
- Updated npm dev dependencies.

## [1.4.0] - 2019-03-17

### Added

- Added support for disabling automatic creation of a AWS::Lambda::Permission. createLambdaPermission flag is enabled by default.


## [1.3.0] - 2018-12-11

### Added

- Added support for a role arn parameter which allows for AWS Kinesis streams to be added as subscription filters.

## [1.2.1] - 2018-10-09

### Changed

- Updated npm dependencies to fix security vulnerabilities

## [1.2.0] - 2018-9-18

### Added

- Added support for per-function exclusion by setting `functions.function.logForwarding.enabled = false` for the given function.

## [1.1.8] - 2018-07-30

### Added

- Added option to support filename as filter logic id, called `normalizedFilterID`. True by default.


## [1.1.7] - 2018-07-30

### Added

- This CHANGELOG file to make it easier for future updates to be documented. Sadly, will not be going back to document changes made for previous versions.
