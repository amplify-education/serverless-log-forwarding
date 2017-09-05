'use strict';

const _ = require('underscore');

class LogForwardingPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    /* Hooks tell Serverless when to do what */
    this.hooks = {
      'before:deploy:initialize': this.updateResources.bind(this),
    };
  }


  /**
   * Updates CloudFormation resources with log forwarding
   */
  updateResources() {
    // check if stage is specified in config
    const service = this.serverless.service;
    const stage = this.options.stage;
    if (service.custom.logForwarding.stages &&
      service.custom.logForwarding.stages.indexOf(stage) === -1) {
      this.serverless.cli.log(`Log Forwarding is ignored for ${stage} stage`);
      return;
    }

    this.serverless.cli.log('Updating Log Forwarding Resources...');
    const resourceObj = this.createResourcesObj();
    if (this.serverless.service.resources === undefined) {
      this.serverless.service.resources = {
        Resources: {},
      };
    }
    _.extend(this.serverless.service.resources.Resources, resourceObj);
    this.serverless.cli.log('Log Forwarding Resources Updated');
  }


  /**
   * Creates CloudFormation resources object with log forwarding
   * @return {Object} resources object
   */
  createResourcesObj() {
    const service = this.serverless.service;
    const options = this.options;
    // Checks if the serverless file is setup correctly
    if (service.custom.logForwarding.destinationARN == null) {
      throw new Error('Serverless-log-forwarding is not configured correctly. Please see README for proper setup.');
    }
    const filterPattern = service.custom.logForwarding.filterPattern || '';
    // Get options and parameters to make resources object
    const serviceName = service.service;
    const arn = service.custom.logForwarding.destinationARN;
    const stage = options.stage && options.stage.length > 0
      ? options.stage
      : service.provider.stage;
    // Get list of all functions in this lambda
    const functions = _.keys(service.functions);
    const principal = `logs.${service.provider.region}.amazonaws.com`;
    // Generate resources object for each function
    // Only one lambda permission is needed
    const resourceObj = {
      LogForwardingLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          FunctionName: arn,
          Action: 'lambda:InvokeFunction',
          Principal: principal,
        },
      },
    };
    for (let i = 0; i < functions.length; i += 1) {
      /* merge new SubscriptionFilter with current resources object */
      const subscriptionFilter = LogForwardingPlugin.makeSubscriptionFilter(serviceName,
        stage, arn, functions[i], filterPattern);
      _.extend(resourceObj, subscriptionFilter);
    }
    return resourceObj;
  }


  /**
   * Makes a Subscription Filter object for given function name
   * @param  {String} serviceName  name of current service
   * @param  {String} stage        stage this lambda is being deployed to
   * @param  {String} arn          arn of the lambda to forward to
   * @param  {String} functionName name of function to make SubscriptionFilter for
   * @param  {String} filterPattern filter pattern for the Subscription
   * @return {Object}               SubscriptionFilter
   */
  static makeSubscriptionFilter(serviceName, stage, arn, functionName, filterPattern) {
    const logGroupName = `/aws/lambda/${serviceName}-${stage}-${functionName}`;
    const filter = {};
    filter[`SubscriptionFilter${functionName}`] = {
      Type: 'AWS::Logs::SubscriptionFilter',
      Properties: {
        DestinationArn: arn,
        FilterPattern: filterPattern,
        LogGroupName: logGroupName,
      },
      DependsOn: [
        'LogForwardingLambdaPermission',
      ],
    };
    return filter;
  }
}

module.exports = LogForwardingPlugin;
