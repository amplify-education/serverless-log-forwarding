export interface ObjectCF<TProps> {
  Type: string;
  DependsOn?: string[];
  Properties?: TProps;
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

/**
 * If your plugin adds new properties to any level in the serverless.yml
 * you can use these functions to add JSON ajv based schema validation for
 * those properties
 *
 * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration
 */
export interface ConfigSchemaHandler {
  /**
   * If your plugin requires additional top-level properties (like provider, custom, service...)
   * you can use the defineTopLevelProperty helper to add their definition.
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#top-level-properties-via-definetoplevelproperty
   */
  defineTopLevelProperty (
    providerName: string,
    schema: Record<string, unknown>
  ): void;

  /**
   * If your plugin depends on properties defined in the custom: section, you can use the
   * defineCustomProperties helper
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#properties-in-custom-via-definecustomproperties
   */
  defineCustomProperties (jsonSchema: object): void;

  /**
   * If your plugin adds support to a new function event, you can use the
   * defineFunctionEvent helper
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#function-events-via-definefunctionevent
   */
  defineFunctionEvent (
    providerName: string,
    event: string,
    jsonSchema: Record<string, object>
  ): void;

  /**
   * If your plugin adds new properties to a function event, you can use the
   * defineFunctionEventProperties helper
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#function-event-properties-via-definefunctioneventproperties
   */
  defineFunctionEventProperties (
    providerName: string,
    existingEvent: string,
    jsonSchema: object
  ): void;

  /**
   * If your plugin adds new properties to functions, you can use the
   * defineFunctionProperties helper.
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#function-properties-via-definefunctionproperties
   */
  defineFunctionProperties (providerName: string, schema: object): void;

  /**
   * If your plugin provides support for a new provider, register it via defineProvider
   * @see https://www.serverless.com/framework/docs/guides/plugins/custom-configuration#new-provider-via-defineprovider
   */
  defineProvider (providerName: string, options?: Record<string, unknown>): void;
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
    functions?: Record<string, object>,
    getFunction (name: string): SlsFunction,
    custom: {
      logForwarding?: PluginConfig
    },
  },
  providers: {
    aws?: {
      getRegion (): string,
    },
  },

  getProvider (name: string): AWSProvider,

  configSchemaHandler: ConfigSchemaHandler;
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
