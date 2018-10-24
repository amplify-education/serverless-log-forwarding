# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.2] - 2018-10-24

### Added

- Added option, called `disabledLambdaPermission`, to support disabling the creation of a AWS::Lambda::Permission. False by default.

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
