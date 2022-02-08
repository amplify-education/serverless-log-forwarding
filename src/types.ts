export interface ServerlessInstance {
  service: {
    service: string
    resources: {
      Resources: Record<string, unknown>
    },
    provider: {
      stage: string,
      region: string
    },
    functions: {
      name: object
    },
    getFunction (name: string),
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
    consoleLog (str: string),
  }
}

export interface ServerlessConfig {
  commands: string[];
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
