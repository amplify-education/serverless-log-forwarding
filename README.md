# serverless-log-forwarding
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/amplify-education/serverless-domain-manager/master/LICENSE)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/bb1e50c048434012bd57eb73225a089e)](https://www.codacy.com/app/CFER/serverless-log-forwarding?utm_source=github.com&utm_medium=referral&utm_content=amplify-education/serverless-log-forwarding&utm_campaign=badger)
[![Build Status](https://travis-ci.org/amplify-education/serverless-log-forwarding.svg?branch=master)](https://travis-ci.org/amplify-education/serverless-log-forwarding)
[![npm version](https://badge.fury.io/js/serverless-log-forwarding.svg)](https://badge.fury.io/js/serverless-log-forwarding)

Serverless plugin for forwarding CloudWatch logs to another Lambda function.

# About Amplify
Amplify builds innovative and compelling digital educational products that empower teachers and students across the country. We have a long history as the leading innovator in K-12 education - and have been described as the best tech company in education and the best education company in tech. While others try to shrink the learning experience into the technology, we use technology to expand what is possible in real classrooms with real students and teachers.

# Getting Started

## Prerequisites
Make sure you have the following installed before starting:
* [nodejs](https://nodejs.org/en/download/)
* [npm](https://www.npmjs.com/get-npm)
* [serverless](https://serverless.com/framework/docs/providers/aws/guide/installation/)

## Installing
To install the plugin, run:

```
npm install serverless-log-forwarding
```

Then make the following edits to your serverless.yaml file:
```yaml
plugins:
  - serverless-log-forwarding

custom:
  logForwarding:
    destinationARN: '[ARN of Lambda Function to forward logs to]'
    # optional:
    filterPattern: '[filter pattern for logs that are sent to Lambda function]'
    stages:
      - '[name of the stage to apply log forwarding]'
      - '[another stage name to filter]'
```

## Running Tests
To run the test:
```
npm test
```
All tests should pass.

If there is an error update the node_module inside the serverless-log-forwarding folder:
```
npm install
```

## Deploying
---------
The plugin will be packaged with the lambda when deployed as normal using Serverless:
```
serverless deploy
```

# Responsible Disclosure
If you have any security issue to report, contact project maintainers privately.
You can reach us at <github@amplify.com>

# Contributing
We welcome pull requests! For your pull request to be accepted smoothly, we suggest that you:
1. For any sizable change, first open a GitHub issue to discuss your idea.
2. Create a pull request.  Explain why you want to make the change and what it’s for.
We’ll try to answer any PRs promptly.
