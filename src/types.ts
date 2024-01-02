export interface ObjectCF<TProps> {
  Type: string;
  DependsOn?: string[];
  Properties: TProps;
}

export type ResourcesCF = Record<string, ObjectCF<unknown>>;

export interface AWSProvider {
  naming: {
    getLogGroupName (name: string): string,
    getNormalizedFunctionName (name: string): string,
    getLogGroupLogicalId (name: string): string
  }
}

export interface SlsFunction {
  name: string;
  logForwarding?: {
    enabled?: boolean;
  }
}

export interface PluginConfig {
  stages?: string[];
  roleArn?: string;
  filterPattern: string;
  normalizedFilterID: boolean;
  createLambdaPermission: boolean;
  destinationARN: string;
}

export interface ServerlessInstance {
  service: {
    service: string
    resources: {
      Resources: ResourcesCF
    },
    provider: {
      stage: string,
      region: string
    },
    functions: {
      name: unknown[];
    },
    getFunction (name: string): SlsFunction,
    custom: {
      logForwarding: PluginConfig
    },
  },
  providers: {
    aws: {
      getRegion (): string,
    },
  },

  getProvider (name: string): AWSProvider,

  cli: {
    log (str: string, entity?: string): void,
    consoleLog (str: string): void,
  }
}

export interface ServerlessConfig {
  commands: string[];
  options: Record<string, unknown>;
  stage: string | null;
}

export interface LambdaPermissionProps {
  Action: string;
  Principal: string;
  FunctionName: string;
}

export interface SubscriptionFilterProps {
  DestinationArn: string;
  FilterPattern: string;
  LogGroupName: string;
  RoleArn?: string;
}

interface ServerlessProgress {
  update (message: string): void

  remove (): void
}

export interface ServerlessProgressFactory {
  get (name: string): ServerlessProgress;
}

export interface ServerlessUtils {
  writeText: (message: string) => void,
  log: ((message: string) => void) & {
    error (message: string): void
    verbose (message: string): void
    warning (message: string): void
  }
  progress: ServerlessProgressFactory
}

export type LambdaPermissionCF = ObjectCF<LambdaPermissionProps>;

export type SubscriptionFilterCF = ObjectCF<SubscriptionFilterProps>;
