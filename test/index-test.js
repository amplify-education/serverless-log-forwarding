const chai = require('chai');
const LogForwardingPlugin = require('../index.js');

const expect = chai.expect;

const correctConfig = {
  destinationARN: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
};
const constructPluginResources = (logForwarding) => {
  const serverless = {
    service: {
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
          name: 'functionOne',
        },
        testFunctionTwo: {
          name: 'functionTwo',
        },
      },
      service: 'test-service',
    },
    cli: {
      log() {
      },
    },
  };
  return new LogForwardingPlugin(serverless, {});
};
const constructPluginNoResources = (logForwarding) => {
  const serverless = {
    service: {
      provider: {
        region: 'us-moon-1',
        stage: 'test-stage',
      },
      custom: {
        logForwarding,
      },
      resources: undefined,
      functions: {
        testFunctionOne: {
          name: 'functionOne',
        },
        testFunctionTwo: {
          name: 'functionTwo',
        },
      },
      service: 'test-service',
    },
    cli: {
      log() {
      },
    },
  };
  return new LogForwardingPlugin(serverless, {});
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
        SubscriptionFiltertestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
          ],
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
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
        SubscriptionFiltertestFunctionOne: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionOne',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
          ],
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward',
            FilterPattern: '',
            LogGroupName: '/aws/lambda/test-service-test-stage-testFunctionTwo',
          },
          DependsOn: [
            'LogForwardingLambdaPermission',
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
