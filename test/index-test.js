const chai = require('chai');
const LogForwardingPlugin = require('../index.js');

const expect = chai.expect;

const correctConfig = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
};
const correctConfigFromParam = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-dev-forward',
};
const correctConfigWithFilterPattern = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
  filterPattern: 'Test Pattern',
  normalizedFilterID: false,
};
const correctConfigWithStageFilter = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
  filterPattern: 'Test Pattern',
  stages: ['production'],
};
const correctConfigWithRoleArn = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
  roleArn: 'arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role',
  normalizedFilterID: false,
};

const Serverless = require('serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');

const createServerless = (options, service) => {
  const serverless = new Serverless(options);
  serverless.cli = {
    log() {
    },
  };
  new AwsProvider(serverless, options); // eslint-disable-line no-new
  serverless.service.update(service);
  serverless.service.setFunctionNames(options);
  return serverless;
};

const constructPluginResources = (logForwarding, functions) => {
  const options = {};
  const serverless = createServerless(options, {
    provider: {
      region: 'us-moon-1',
      stage: 'test-stage',
    },
    custom: {
      logForwarding,
    },
    resources: {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
      },
    },
    functions: functions || {
      testFunctionOne: {
        filterPattern: 'Pattern',
      },
      testFunctionTwo: {
      },
    },
    service: 'test-service',
  });
  return new LogForwardingPlugin(serverless, options);
};
const constructPluginNoResources = (logForwarding) => {
  const options = {};
  const serverless = createServerless(options, {
    provider: {
      region: 'us-moon-1',
      stage: 'test-stage',
    },
    custom: {
      logForwarding,
    },
    functions: {
      testFunctionOne: {
      },
      testFunctionTwo: {
      },
    },
    service: 'test-service',
  });
  serverless.service.resources = undefined;
  return new LogForwardingPlugin(serverless, options);
};

const constructPluginResourcesWithParam = (logForwarding) => {
  const options = { stage: 'dev' };
  const serverless = createServerless(options, {
    provider: {
      region: 'us-moon-1',
      stage: 'test-stage',
    },
    custom: {
      logForwarding,
    },
    resources: {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
      },
    },
    functions: {
      testFunctionOne: {
        filterPattern: 'Pattern',
      },
      testFunctionTwo: {
      },
    },
    service: 'test-service',
  });
  return new LogForwardingPlugin(serverless, options);
};

describe('Given a serverless config', () => {
  it('updates the resources object if it already exists', () => {
    const plugin = constructPluginResources(correctConfig);
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
        LogForwardingLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            FunctionName: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            Action: 'lambda:InvokeFunction',
            Principal: 'logs.us-moon-1.amazonaws.com',
          },
        },
        SubscriptionFilterTestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionTwoLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it('updates the resources object if it already exists with params', () => {
    const plugin = constructPluginResourcesWithParam(correctConfigFromParam);
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
        LogForwardingLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            FunctionName: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-dev-forward',
            Action: 'lambda:InvokeFunction',
            Principal: 'logs.us-moon-1.amazonaws.com',
          },
        },
        SubscriptionFilterTestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-dev-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-dev-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-dev-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-dev-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionTwoLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it('updates the resources object if it doesn\'t exist', () => {
    const plugin = constructPluginNoResources(correctConfig);
    const expectedResources = {
      Resources: {
        LogForwardingLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            FunctionName: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            Action: 'lambda:InvokeFunction',
            Principal: 'logs.us-moon-1.amazonaws.com',
          },
        },
        SubscriptionFilterTestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionTwoLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it('uses the filterPattern property if set', () => {
    const plugin = constructPluginResources(correctConfigWithFilterPattern);
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
        LogForwardingLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            FunctionName: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            Action: 'lambda:InvokeFunction',
            Principal: 'logs.us-moon-1.amazonaws.com',
          },
        },
        SubscriptionFiltertestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: 'Test Pattern',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: 'Test Pattern',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionTwoLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });

  it('excludes functions with logForwarding.enabled=false from AWS::Logs::SubscriptionFilter output', () => {
    const plugin = constructPluginResources(correctConfigWithFilterPattern, {
      testFunctionOne: {
      },
      testFunctionTwo: {
        logForwarding: {},
      },
      testFunctionThree: {
        logForwarding: {
          enabled: true,
        },
      },
      testFunctionFour: {
        logForwarding: {
          enabled: false,
        },
      },
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
        LogForwardingLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            FunctionName: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            Action: 'lambda:InvokeFunction',
            Principal: 'logs.us-moon-1.amazonaws.com',
          },
        },
        SubscriptionFiltertestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: 'Test Pattern',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: 'Test Pattern',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionTwoLogGroup',
          ],
        },
        SubscriptionFiltertestFunctionThree: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: 'Test Pattern',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionThree',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
            'TestFunctionThreeLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });

  it('uses stage filter if set', () => {
    const plugin = constructPluginResources(correctConfigWithStageFilter);
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });

  it('uses the roleArn property if set', () => {
    const plugin = constructPluginResources(correctConfigWithRoleArn);
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: 'AWS:Test:Filter',
        },
        SubscriptionFiltertestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
            RoleArn: 'arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role',
          },
          DependsOn: [
            'TestFunctionOneLogGroup',
          ],
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
            RoleArn: 'arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role',
          },
          DependsOn: [
            'TestFunctionTwoLogGroup',
          ],
        },
      },
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
});

describe('Catching errors in serverless config ', () => {
  it('missing custom log forwarding options', () => {
    const emptyConfig = {};
    const plugin = constructPluginResources(emptyConfig);
    const expectedError = 'Serverless-log-forwarding is not configured correctly. Please see README for proper setup.';
    expect(plugin.updateResources.bind(plugin)).to.throw(expectedError);
  });
});
