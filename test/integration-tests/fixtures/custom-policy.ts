import * as aws from 'aws-sdk';
import * as base from '../base';

const statementId = `invokeLambdaStatement${base.RANDOM_STRING}`;

export interface CustomPolicyFixture {
  readonly statementId: string;
}

aws.config.update({ region: 'us-west-2' });
const lambda = new aws.Lambda({ apiVersion: '2015-03-31' });

export async function setUpCustomPolicy(functionName: string): Promise<CustomPolicyFixture> {
  await lambda.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: functionName,
    Principal: 'logs.us-west-2.amazonaws.com',
    StatementId: statementId,
  }).promise();
  console.debug('\tCustom policy was created');
  return { statementId };
}

export async function tearDownCustomPolicy(functionName: string): Promise<void> {
  try {
    await lambda.removePermission({
      FunctionName: functionName,
      StatementId: statementId,
    }).promise();
    console.debug('\tCustom policy was deleted');
  } catch (e) {
    console.debug('\tFailed to delete a custom policy');
  }
}
