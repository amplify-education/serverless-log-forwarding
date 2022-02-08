import * as _ from 'underscore';
import { AWSProvider, ServerlessInstance, ServerlessConfig } from './types';

interface PluginConfig {
  stages?: string[];
  roleArn?: string;
  filterPattern: string;
  normalizedFilterID: boolean;
  createLambdaPermission: boolean;
  destinationARN: string;
}

const configDefaults = {
  filterPattern: '',
  normalizedFilterID: true,
  createLambdaPermission: true,
};

interface CFObject<TProps> {
  Type: string;
  DependsOn?: string[];
  Properties: TProps;
}

interface LambdaPermissionProps {
  Action: string;
  Principal: string;
  FunctionName: string;
}

interface SubscriptionFilterProps {
  DestinationArn: string;
  FilterPattern: string;
  LogGroupName: string;
  RoleArn?: string;
}

type LambdaPermission = CFObject<LambdaPermissionProps>;
type SubscriptionFilter = CFObject<SubscriptionFilterProps>;

function getStage(options: ServerlessConfig, sls: ServerlessInstance) {
  if (options.stage && options.stage !== '') {
    return options.stage;
  }
  return sls.service.provider.stage;
}

class LogForwardingPlugin {
  options: ServerlessConfig;

  provider: AWSProvider;

  serverless: ServerlessInstance;

  config: PluginConfig | null = null;

  hooks: object;

  constructor(serverless: ServerlessInstance, options: ServerlessConfig) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');
    this.hooks = {
      'package:initialize': this.updateResources.bind(this),
    };
  }

  loadConfig() {
    this.config = { ...configDefaults, ...this.serverless.service.custom.logForwarding };
    if (this.config.destinationARN === undefined) {
      throw new Error('Serverless-log-forwarding is not configured correctly. Please see README for proper setup.');
    }
  }

  /**
   * Updates CloudFormation resources with log forwarding
   */
  updateResources() {
    this.loadConfig();
    const stage = getStage(this.options, this.serverless);
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

  private getResources() {
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

  createResourcesObj(): object {
    const { service } = this.serverless;
    const resourceObj = {};

    const createLambdaPermission = this.config.createLambdaPermission && !this.config.roleArn;
    const permissionId = 'LogForwardingLambdaPermission';
    if (createLambdaPermission) {
      const permission = this.makeLambdaPermission();
      resourceObj[permissionId] = permission;
    }

    _.keys(service.functions)
      .filter((functionName) => {
        const { logForwarding = {} } = this.serverless.service.getFunction(functionName);
        return !(logForwarding.enabled === false);
      })
      .forEach((functionName) => {
        const filterId = this.getFilterId(functionName);
        const dependsOn = createLambdaPermission ? [permissionId] : [];
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

  makeSubsctiptionFilter(functionName: string, deps?: string[]): SubscriptionFilter {
    const functionObject = this.serverless.service.getFunction(functionName);
    const logGroupName = this.provider.naming.getLogGroupName(functionObject.name);
    const logGroupId = this.provider.naming.getLogGroupLogicalId(functionName);
    const roleObject = this.config.roleArn ? { RoleArn: this.config.roleArn } : {};
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

  makeLambdaPermission(): LambdaPermission {
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
