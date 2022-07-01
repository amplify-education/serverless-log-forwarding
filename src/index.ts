import * as _ from 'underscore';
import type {
  AWSProvider,
  ServerlessInstance,
  ServerlessConfig,
  PluginConfig,
  ResourcesCF,
  SubscriptionFilterCF,
  LambdaPermissionCF,
} from './types';

const CONFIG_DEFAULTS = {
  filterPattern: '',
  normalizedFilterID: true,
  createLambdaPermission: true,
};

class LogForwardingPlugin {
  options: ServerlessConfig;

  provider: AWSProvider;

  serverless: ServerlessInstance;

  config: PluginConfig | null = null;

  hooks: Record<string, () => void>;

  // The key of a lambda permission in CloudFormation resources
  permissionId = 'LogForwardingLambdaPermission';

  constructor(serverless: ServerlessInstance, options: ServerlessConfig) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');
    this.hooks = {
      'package:initialize': this.updateResources.bind(this),
    };

    // schema for the function section of serverless.yml
    this.serverless.configSchemaHandler.defineFunctionProperties('aws', {
      properties: {
        logForwarding: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
            },
          },
          required: ['enabled'],
        },
      },
      required: [],
    });

    // schema for the custom props section of serverless.yml
    this.serverless.configSchemaHandler.defineCustomProperties({
      properties: {
        logForwarding: {
          type: 'object',
          properties: {
            destinationARN: { type: 'string' },
            roleArn: { type: 'string' },
            filterPattern: { type: 'string' },
            normalizedFilterID: { type: 'string' },
            stages: {
              type: 'array',
              uniqueItems: true,
              items: { type: 'string' },
            },
            createLambdaPermission: { type: 'boolean' },
          },
          required: ['destinationARN'],
        },
      },
      required: ['logForwarding'],
    });
  }

  loadConfig(): void {
    const { service } = this.serverless;
    if (!service.custom || !service.custom.logForwarding) {
      throw new Error('Serverless-log-forwarding configuration not provided.');
    }
    this.config = { ...CONFIG_DEFAULTS, ...service.custom.logForwarding };
    if (this.config.destinationARN === undefined) {
      throw new Error(
        'Serverless-log-forwarding is not configured correctly. Please see README for proper setup.',
      );
    }
  }

  updateResources(): void {
    this.loadConfig();
    const stage = this.getStage();
    if (this.config.stages && !this.config.stages.includes(stage)) {
      this.serverless.cli.log(`Log Forwarding is ignored for ${stage} stage`);
      return;
    }
    this.serverless.cli.log('Updating Log Forwarding Resources...');
    const resourceObj = this.createResourcesObj();
    const cfResources = this.getResources();
    _.extend(cfResources, resourceObj);
    this.serverless.cli.log('Log Forwarding Resources Updated');
  }

  private getResources(): ResourcesCF {
    const { service } = this.serverless;
    if (service.resources === undefined) {
      service.resources = {
        Resources: {},
      };
    }
    if (service.resources.Resources === undefined) {
      service.resources.Resources = {};
    }
    return service.resources.Resources;
  }

  createResourcesObj(): ResourcesCF {
    const { service } = this.serverless;
    const resourceObj = {};

    const createLambdaPermission = this.config.createLambdaPermission && !this.config.roleArn;
    if (createLambdaPermission) {
      const permission = this.makeLambdaPermission();
      resourceObj[this.permissionId] = permission;
    }

    _.keys(service.functions)
      .filter((functionName) => {
        const { logForwarding = {} } = this.serverless.service.getFunction(functionName);
        if (logForwarding.enabled === undefined) {
          return true;
        }
        return !!logForwarding.enabled;
      })
      .forEach((functionName) => {
        const filterId = this.getFilterId(functionName);
        const dependsOn = createLambdaPermission ? [this.permissionId] : [];
        const filter = this.makeSubsctiptionFilter(functionName, dependsOn);
        resourceObj[filterId] = filter;
      });
    return resourceObj;
  }

  getFilterId(functionName: string): string {
    const filterName = this.config.normalizedFilterID
      ? this.provider.naming.getNormalizedFunctionName(functionName)
      : functionName;
    return `SubscriptionFilter${filterName}`;
  }

  getStage(): string {
    const { stage } = this.options;
    if (stage && stage !== '') {
      return stage;
    }
    return this.serverless.service.provider.stage;
  }

  makeSubsctiptionFilter(
    functionName: string,
    deps?: string[],
  ): SubscriptionFilterCF {
    const functionObject = this.serverless.service.getFunction(functionName);
    const logGroupName = this.provider.naming.getLogGroupName(functionObject.name);
    const logGroupId = this.provider.naming.getLogGroupLogicalId(functionName);
    const roleObject = this.config.roleArn
      ? { RoleArn: this.config.roleArn }
      : {};
    return {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn: this.config.destinationARN,
        FilterPattern: this.config.filterPattern,
        LogGroupName: logGroupName,
        ...roleObject,
      },
      DependsOn: _.union(deps, [logGroupId]),
    };
  }

  makeLambdaPermission(): LambdaPermissionCF {
    const { region } = this.serverless.service.provider;
    const principal = `logs.${region}.amazonaws.com`;
    return {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: this.config.destinationARN,
        Action: 'lambda:InvokeFunction',
        Principal: principal,
      },
    };
  }
}

export = LogForwardingPlugin;
