import { expect } from "chai";
import { ServerlessConfig, ServerlessInstance } from "../../src/types";
import LogForwardingPlugin = require("../../src");

const TEST_DESTINATION_ARN = "arn:aws:lambda:us-moon-1:314159265358:function:testforward-test-forward";

const createServerless = (service, options) => {
  const funcLowerName = (name) => name.charAt(0).toLowerCase() + name.slice(1);
  const funcUpperName = (name) => name.charAt(0).toUpperCase() + name.slice(1);

  service.getFunction = (name: string) => {
    return {
      name: funcUpperName(name),
      ...service.functions[name]
    };
  };
  return {
    cli: {
      log (str: string) {
      }
    },
    providers: {},
    getProvider (name: string) {
      const state = options.stage || service.provider.stage;
      return {
        naming: {
          getLogGroupName: (name: string) => `/aws/lambda/${service.service}-${state}-${funcLowerName(name)}`,
          getNormalizedFunctionName: (name: string) => funcUpperName(name),
          getLogGroupLogicalId: (name: string) => `${funcUpperName(name)}LogGroup`
        }
      };
    },
    configSchemaHandler: {
      defineTopLevelProperty: () => null,
      defineCustomProperties: () => null,
      defineFunctionEvent: () => null,
      defineFunctionEventProperties: () => null,
      defineFunctionProperties: () => null,
      defineProvider: () => null
    },
    service
  };
};

const constructPluginResources = (logForwarding, functions?) => {
  const config = {
    commands: [],
    options: {}
  };
  const serverless = createServerless({
    service: "test-service",
    provider: {
      name: "aws",
      region: "us-moon-1",
      stage: "test-stage"
    },
    custom: {
      logForwarding
    },
    resources: {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        }
      }
    },
    functions: functions || {
      testFunctionOne: {
        filterPattern: "Pattern"
      },
      testFunctionTwo: {}
    }
  }, config);
  return new LogForwardingPlugin(serverless as ServerlessInstance, config as ServerlessConfig);
};
const constructPluginNoResources = (logForwarding) => {
  const config = {
    commands: [],
    options: {}
  };
  const serverless = createServerless({
    provider: {
      region: "us-moon-1",
      stage: "test-stage"
    },
    custom: {
      logForwarding
    },
    functions: {
      testFunctionOne: {},
      testFunctionTwo: {}
    },
    service: "test-service"
  }, config);
  serverless.service.resources = undefined;
  return new LogForwardingPlugin(serverless as ServerlessInstance, config as ServerlessConfig);
};
const constructPluginResourcesWithParam = (logForwarding) => {
  const options = {
    commands: [],
    options: {},
    stage: "dev"
  };
  const serverless = createServerless({
    provider: {
      name: "aws",
      region: "us-moon-1",
      stage: "test-stage"
    },
    custom: {
      logForwarding
    },
    resources: {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        }
      }
    },
    functions: {
      testFunctionOne: {
        filterPattern: "Pattern"
      },
      testFunctionTwo: {}
    },
    service: "test-service"
  }, options);
  return new LogForwardingPlugin(serverless as ServerlessInstance, options);
};

describe("Given a serverless config", () => {
  it("updates the resources object if it already exists", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        LogForwardingLambdaPermission: {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: TEST_DESTINATION_ARN,
            Action: "lambda:InvokeFunction",
            Principal: "logs.us-moon-1.amazonaws.com"
          }
        },
        SubscriptionFilterTestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("updates the resources object if it already exists with params", () => {
    const plugin = constructPluginResourcesWithParam({
      destinationARN: TEST_DESTINATION_ARN
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        LogForwardingLambdaPermission: {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: TEST_DESTINATION_ARN,
            Action: "lambda:InvokeFunction",
            Principal: "logs.us-moon-1.amazonaws.com"
          }
        },
        SubscriptionFilterTestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-dev-testFunctionOne"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-dev-testFunctionTwo"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("updates the resources object if it doesn't exist", () => {
    const plugin = constructPluginNoResources({
      destinationARN: TEST_DESTINATION_ARN
    });
    const expectedResources = {
      Resources: {
        LogForwardingLambdaPermission: {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: TEST_DESTINATION_ARN,
            Action: "lambda:InvokeFunction",
            Principal: "logs.us-moon-1.amazonaws.com"
          }
        },
        SubscriptionFilterTestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFilterTestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("uses the filterPattern property if set", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      filterPattern: "Test Pattern",
      normalizedFilterID: false
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        LogForwardingLambdaPermission: {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: TEST_DESTINATION_ARN,
            Action: "lambda:InvokeFunction",
            Principal: "logs.us-moon-1.amazonaws.com"
          }
        },
        SubscriptionFiltertestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "Test Pattern",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "Test Pattern",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("excludes functions with logForwarding.enabled=false from AWS::Logs::SubscriptionFilter output", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      filterPattern: "Test Pattern",
      normalizedFilterID: false
    }, {
      testFunctionOne: {},
      testFunctionTwo: {
        logForwarding: {}
      },
      testFunctionThree: {
        logForwarding: {
          enabled: true
        }
      },
      testFunctionFour: {
        logForwarding: {
          enabled: false
        }
      }
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        LogForwardingLambdaPermission: {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: TEST_DESTINATION_ARN,
            Action: "lambda:InvokeFunction",
            Principal: "logs.us-moon-1.amazonaws.com"
          }
        },
        SubscriptionFiltertestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "Test Pattern",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "Test Pattern",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionTwoLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionThree: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "Test Pattern",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionThree"
          },
          DependsOn: [
            "LogForwardingLambdaPermission",
            "TestFunctionThreeLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("uses stage filter if set", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      filterPattern: "Test Pattern",
      stages: ["production"]
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("uses the roleArn property if set", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      roleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role",
      normalizedFilterID: false
    });

    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        SubscriptionFiltertestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne",
            RoleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role"
          },
          DependsOn: [
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo",
            RoleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role"
          },
          DependsOn: [
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("uses the disabledLambdaPermission property if set to not include the LogForwardingLambdaPermission", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      normalizedFilterID: false,
      createLambdaPermission: false
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        SubscriptionFiltertestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne"
          },
          DependsOn: [
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo"
          },
          DependsOn: [
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
  it("uses the roleArn even if disabledLambdaPermission property is set", () => {
    const plugin = constructPluginResources({
      destinationARN: TEST_DESTINATION_ARN,
      roleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role",
      normalizedFilterID: false,
      createLambdaPermission: false
    });
    const expectedResources = {
      Resources: {
        TestExistingFilter: {
          Type: "AWS:Test:Filter"
        },
        SubscriptionFiltertestFunctionOne: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionOne",
            RoleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role"
          },
          DependsOn: [
            "TestFunctionOneLogGroup"
          ]
        },
        SubscriptionFiltertestFunctionTwo: {
          Type: "AWS::Logs::SubscriptionFilter",
          Properties: {
            DestinationArn: TEST_DESTINATION_ARN,
            FilterPattern: "",
            LogGroupName: "/aws/lambda/test-service-test-stage-testFunctionTwo",
            RoleArn: "arn:aws:lambda:us-moon-1:314159265358:role/test-iam-role"
          },
          DependsOn: [
            "TestFunctionTwoLogGroup"
          ]
        }
      }
    };
    plugin.updateResources();
    expect(plugin.serverless.service.resources).to.eql(expectedResources);
  });
});

describe("Catching errors in serverless config ", () => {
  it("missing custom log forwarding options", () => {
    const emptyConfig = {};
    const plugin = constructPluginResources(emptyConfig);
    const expectedError = "Serverless-log-forwarding is not configured correctly. Please see README for proper setup.";
    expect(plugin.updateResources.bind(plugin)).to.throw(expectedError);
  });
});
