const fs = require('fs');
const chai = require('chai');
const aws = require('aws-sdk');
const utilities = require('./test-utilities');
const base = require('./base');

const CONFIGS_FOLDER = 'configs';
const RESOURCE_FOLDER = 'resources';
const TIMEOUT_MINUTES = 15 * 60 * 1000; // 5 minutes in milliseconds

const logsReceiverName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver`;

const lambda = new aws.Lambda({ apiVersion: '2015-03-31' });
const iam = new aws.IAM();
const sts = new aws.STS();

async function createDummyFunction(functionName) {
  const resp = await lambda.createFunction({
    Code: {
      ZipFile: fs.readFileSync(`test/integration-tests/${RESOURCE_FOLDER}/logs-receiver.zip`),
    },
    Architectures: ['x86_64'],
    Handler: 'index.handler',
    FunctionName: functionName,
    Role: 'arn:aws:iam::646102706174:role/lambda_basic_execution',
    Runtime: 'nodejs14.x',
  }).promise();
  return resp.FunctionArn;
}

async function ensureFunctionCreated(functionName) {
  const maxRetries = 10;
  const delayMs = 500;
  for (let retry = 1; retry <= maxRetries; retry += 1) {
    const resp = await lambda.getFunction({ FunctionName: functionName }).promise();
    if (resp.Configuration.State === 'Active') {
      return;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw Error('Function initializing timeout.');
}

async function pingFunction(functionName) {
  await lambda.invoke({
    FunctionName: functionName,
    Payload: Buffer.from('{}'),
  }).promise();
}

async function* resourceContext(testName) {
  const configFolder = `${CONFIGS_FOLDER}/${testName}`;
  await utilities.createResources(configFolder, testName);
  try {
    yield;
  } finally {
    await utilities.destroyResources(testName);
  }
}

async function isFunctionPolicyExists(functionName) {
  try {
    const resp = await lambda.getPolicy({ FunctionName: functionName }).promise();
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') {
      return false;
    }
    throw e;
  }
  return true;
}

async function createRole(roleName) {
  await iam.createRole({
    AssumeRolePolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: {
          Service: 'logs.us-west-2.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      }],
    }),
    RoleName: roleName,
  }).promise();
}

async function deleteRole(roleName) {
  await iam.deleteRole({ RoleName: roleName }).promise();
}

async function createPolicy(policyName, functionArn) {
  await iam.createPolicy({
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: 'lambda:InvokeFunction',
        Resource: functionArn,
      },
      {
        Effect: 'Allow',
        Action: 'logs:PutSubscriptionFilter',
        Resource: '*',
      },
      {
        Effect: 'Allow',
        Action: 'iam:PassRole',
        Resource: '*',
      }],
    }),
    PolicyName: policyName,
  }).promise();
}

async function deletePolicy(policyArn) {
  await iam.deletePolicy({ PolicyArn: policyArn }).promise();
}

async function attachPolicy(roleName, policyArn) {
  await iam.attachRolePolicy({
    RoleName: roleName,
    PolicyArn: policyArn,
  }).promise();
}

async function detachPolicy(roleName, policyName) {
  await iam.deleteRolePolicy({
    RoleName: roleName,
    PolicyName: policyName,
  }).promise();
}

describe('Integration Tests', function () {
  this.timeout(TIMEOUT_MINUTES);

  beforeEach(async () => {
    this.logsReceiverArn = await createDummyFunction(logsReceiverName);
    process.env.LOGS_RECEIVER_ARN = this.logsReceiverArn;
    await ensureFunctionCreated(logsReceiverName);
    await pingFunction(logsReceiverName);
  });

  afterEach(async () => {
    await lambda.deleteFunction({ FunctionName: logsReceiverName }).promise();
  });

  it('Single producer', async () => {
    const testName = 'single-producer';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn));
      chai.assert.isTrue(await isFunctionPolicyExists(logsReceiverName));
    }
  });

  it('Multiple producers', async () => {
    const testName = 'multiple-producers';
    const logsProducer1Name = utilities.getFunctionName(testName, 'test', 'logs-producer-1');
    const logsProducer2Name = utilities.getFunctionName(testName, 'test', 'logs-producer-2');
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters1 = await utilities.getSubscriptionFilters(producer1LogGroup);
      chai.assert.isTrue(subscripionFilters1.some(
        (s) => s.destinationArn === this.logsReceiverArn,
      ));
      const subscripionFilters2 = await utilities.getSubscriptionFilters(producer2LogGroup);
      chai.assert.isTrue(subscripionFilters2.some(
        (s) => s.destinationArn === this.logsReceiverArn,
      ));
    }
  });

  it('Multiple producers one disabled', async () => {
    const testName = 'multiple-producers-one-disabled';
    const logsProducer1Name = utilities.getFunctionName(testName, 'test', 'logs-producer-1');
    const logsProducer2Name = utilities.getFunctionName(testName, 'test', 'logs-producer-2');
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters1 = await utilities.getSubscriptionFilters(producer1LogGroup);
      chai.assert.isTrue(subscripionFilters1.some(
        (s) => s.destinationArn === this.logsReceiverArn,
      ));
      const subscripionFilters2 = await utilities.getSubscriptionFilters(producer2LogGroup);
      chai.assert.isTrue(!subscripionFilters2.some(
        (s) => s.destinationArn === this.logsReceiverArn,
      ));
    }
  });

  it('Single producer stage filter pass', async () => {
    const testName = 'single-producer-stage-filter-pass';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn));
    }
  });

  it('Single producer stage filter fail', async () => {
    const testName = 'single-producer-stage-filter-fail';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(!subscripionFilters.some(
        (s) => s.destinationArn === this.logsReceiverArn,
      ));
    }
  });

  it('Single producer filter pattern', async () => {
    const testName = 'single-producer-filter-pattern';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn
                                                      && s.filterPattern === 'helloWorld'));
    }
  });

  describe('With external role', async () => {
    beforeEach(async () => {
      const accountId = (await sts.getCallerIdentity({}).promise()).Account;
      this.roleName = `LogForwardingRole${base.RANDOM_STRING}`;
      this.roleArn = `arn:aws:iam::${accountId}:role/${this.roleName}`;
      this.policyName = `LogForwardingPolicy${base.RANDOM_STRING}`;
      this.policyArn = `arn:aws:iam::${accountId}:policy/${this.policyName}`;
      createRole(this.roleName);
      console.debug('\tRole was created');
      createPolicy(this.policyName, this.functionArn);
      console.debug('\tPolicy was created');
      attachPolicy(this.roleName, this.policyArn);
      console.debug('\tPolicy was attached');
    });

    afterEach(async () => {
      try {
        detachPolicy(this.roleName, this.policyName);
        console.debug('\tPolicy was detached');
      } catch (e) {
        console.debug('\tFailed to detach policy');
      }
      try {
        deletePolicy(this.policyArn);
        console.debug('\tPolicy was deleted');
      } catch (e) {
        console.debug('\tFailed to delete policy');
      }
      try {
        deleteRole(this.roleName);
        console.debug('\tRole was deleted');
      } catch (e) {
        console.debug('\tFailed to delete role');
      }
    });

    it('Single producer no policy', async () => {
      const testName = 'single-producer-no-policy';
      const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
      const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
      for await (const _ of resourceContext(testName)) {
        const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
        chai.assert.isTrue(subscripionFilters.some(
          (s) => s.destinationArn === this.logsReceiverArn,
        ));
        chai.assert.isFalse(await isFunctionPolicyExists(logsReceiverName));
        console.log(subscripionFilters);
      }
    });
  });
});
