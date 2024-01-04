// logs-receiver.ts
/**
 * This file implements a fixture to safely create and delete a lambda function,
 * it's execution role and a log group.
 * @module
 */

import IamWrap from "./aws/iam-wrap";
import LambdaWrap from "./aws/lambda-wrap";
import LogWrap from "./aws/log-wrap";
import { sleep } from "./test-utilities";

/**
 * Interface for the immutable objects with information about
 * the lambda and the execution role that was created by the fixture.
 */
export interface LogsReceiverData {
  readonly functionName: string,
  readonly functionArn: string,
}

export default class LogReceiver {
  private readonly resourceName: string;
  private lambdaWrap: LambdaWrap;
  private iamWrap: IamWrap;
  private logWrap: LogWrap;

  constructor (region: string, resourceName: string) {
    this.resourceName = resourceName;
    // init AWS resources
    this.iamWrap = new IamWrap(region);
    this.lambdaWrap = new LambdaWrap(region);
    this.logWrap = new LogWrap(region);
  }

  /**
   * Creates the execution role for a lambda, lambda itself and ensures
   * that it's active. Returns the information about objects.
   */
  public async setUpLogsReceiver (): Promise<LogsReceiverData> {
    // setup lambda role
    const role = await this.iamWrap.setupLambdaRole(this.resourceName);
    // we need to wait around 10 seconds to use the role
    await sleep(10 * 1000);
    const funcData = await this.lambdaWrap.createDummyFunction(this.resourceName, role.Arn);
    await this.lambdaWrap.ensureFunctionActive(funcData.FunctionName);

    return {
      functionName: funcData.FunctionName,
      functionArn: funcData.FunctionArn
    };
  }

  /**
   * Removes all resources that could possibly be created by
   * the fixture in a safe way.
   */
  async tearDownLogsReceiver (): Promise<void> {
    try {
      await this.lambdaWrap.removeFunction(this.resourceName);
      console.debug("Logs receiver lambda was deleted");
    } catch (e) {
      console.debug("Failed to delete a logs receiver");
    }
    try {
      await this.iamWrap.removeLambdaRole(this.resourceName);
      console.log("Log receiver's role was deleted");
    } catch (e) {
      console.debug("Failed to delete the execution role");
    }
  }
}
