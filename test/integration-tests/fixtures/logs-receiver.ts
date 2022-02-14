// logs-receiver.ts
/**
 * This file implements a fixture to safely create and delete a lambda function,
 * it's execution role and a log group.
 * @module
 */

import * as aws from 'aws-sdk';
import * as retry from 'async-retry';
import { readFileSync } from 'fs';

import * as base from '../base';
import type { Arn, Role } from '../types';

aws.config.update({ region: 'us-west-2' });
const logs = new aws.CloudWatchLogs();
const lambda = new aws.Lambda({ apiVersion: '2015-03-31' });
const iam = new aws.IAM();

const executionPolicyArn = 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole';
const logsReceiverName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver`;
const roleName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver-role`;

/**
 * Creates a lambda function with basic lambda permissions.
 * Returns Arn of the created function.
 */
async function createDummyFunction(functionName: string, roleArn: Arn): Promise<string> {
  const sourceZip = 'test/integration-tests/fixtures/resources/logs-receiver.zip';
  const resp = await lambda.createFunction({
    Code: { ZipFile: readFileSync(sourceZip) },
    Architectures: ['x86_64'],
    Handler: 'index.handler',
    FunctionName: functionName,
    Role: roleArn,
    Runtime: 'nodejs14.x',
  }).promise();
  return resp.FunctionArn;
}

async function ensureFunctionActive(functionName: string): Promise<void> {
  await retry(
    async () => {
      const resp = await lambda.getFunction({ FunctionName: functionName }).promise();
      if (resp.Configuration.State !== 'Active') {
        throw new Error('retry');
      }
    },
  );
}

/**
 * Creates a role with basic lambda permisson. Returns the role.
 */
async function createLambdaRole(): Promise<Role> {
  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [{
      Sid: '',
      Effect: 'Allow',
      Principal: {
        Service: 'lambda.amazonaws.com',
      },
      Action: 'sts:AssumeRole',
    },
    ],
  };
  const { Role } = await iam.createRole({
    RoleName: roleName,
    AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
  }).promise();
  return { roleArn: Role.Arn, roleName: Role.RoleName };
}

/**
 * Interface for the immutable objects with information about
 * the lambda and the execution role that was created by the fixture.
 */
export interface LogsReceiverFixture {
  readonly functionName: string,
  readonly functionArn: Arn,
  readonly roleName: string;
  readonly roleArn: Arn;
}

/**
 * Creates the execution role for a lambda, lambda itself and ensures
 * that it's active. Returns the information about objects.
 */
export async function setUpLogsReceiver(): Promise<LogsReceiverFixture> {
  const role = await createLambdaRole();
  await iam.attachRolePolicy({
    PolicyArn: executionPolicyArn,
    RoleName: role.roleName,
  }).promise();
  console.debug('\tBasic lambda role was created');
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((r) => setTimeout(r, 10000));
  const logsReceiverArn = await createDummyFunction(logsReceiverName, role.roleArn);
  console.debug('\tLogs receiver was created');
  await ensureFunctionActive(logsReceiverName);
  console.debug('\tLogs receiver is active');
  return {
    functionName: logsReceiverName,
    functionArn: logsReceiverArn,
    roleName,
    roleArn: role.roleArn,
  };
}

/**
 * Removes all resources that could possibly be created by
 * the fixture in a safe way.
 */
export async function tearDownLogsReceiver(): Promise<void> {
  try {
    await lambda.deleteFunction({ FunctionName: logsReceiverName }).promise();
    console.debug('\tLogs receiver was deleted');
  } catch (e) {
    console.debug('\tFailed to delete a logs receiver');
  }
  try {
    const logGroupName = `/aws/lambda/${logsReceiverName}`;
    await logs.deleteLogGroup({ logGroupName }).promise();
    console.log("\tLog receiver's log group was deleted");
  } catch (e) {
    console.debug("\tFailed to delete a logs receiver's log group");
  }
  try {
    await iam.detachRolePolicy({ RoleName: roleName, PolicyArn: executionPolicyArn }).promise();
    await iam.deleteRole({ RoleName: roleName }).promise();
    console.debug('\tExecution role was deleted');
  } catch (e) {
    console.error(e);
    console.debug('\tFailed to delete the execution role');
  }
}
