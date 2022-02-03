export interface ServerlessInstance {
  service: {
    service: string
    resources: {
      Resources: {}
    },
    provider: {
      stage: string,
      region: string
    },
    functions: {
      name: {}
    },
    getFunction (name),
    custom: {
      logForwarding: {
        stages: string[] | undefined,
        destinationARN: string,
        filterPattern: string,
        normalizedFilterID: boolean,
        createLambdaPermission: boolean,
        roleArn: string
      }
    },
  },
  providers: {
    aws: {
      getCredentials (),
      getRegion (),
    },
  },
  getProvider (name),
  cli: {
    log (str: string, entity?: string),
    consoleLog (str: any),
  }
}

export interface ServerlessConfig {
  commands: any[];
  options: object;
  stage: string | null;
}

export interface AWSProvider {
  naming: {
    getLogGroupName(name),
    getNormalizedFunctionName(name),
    getLogGroupLogicalId(name)
  }
}
