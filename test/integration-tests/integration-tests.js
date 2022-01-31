const chai = require('chai');
const base = require('./base');
const utilities = require('./test-utilities');

async function runTest(testName, assertFunc) {
  try {
    const configFolder = `configs/${testName}`;
    await utilities.createResources(configFolder, testName);
    await assertFunc.apply();
  } finally {
    await utilities.destroyResources(testName);
  }
}

/* eslint-disable no-param-reassign */

async function setUpLogsReceiver(fixture) {
  fixture.logsReceiverName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver`;
  fixture.logsReceiverArn = await utilities.createDummyFunction(fixture.logsReceiverName);
  process.env.LOGS_RECEIVER_ARN = fixture.logsReceiverArn;
  await utilities.ensureFunctionCreated(fixture.logsReceiverName);
}

async function tearDownLogsReceiver(fixture) {
  await utilities.deleteFunction(fixture.logsReceiverName);
}

async function setUpLambdaCustomPolicy(fixture) {
  chai.assert(fixture.logsReceiverArn, 'requires logsReceiverArn to be set');
  fixture.statementId = await utilities.createCustomPolicy(fixture.logsReceiverArn);
}

/* eslint-enable no-param-reassign */

// eslint-disable-next-line func-names
describe('Integration Tests', function () {
  this.timeout(15 * 60 * 1000);

  beforeEach(async () => { await setUpLogsReceiver(this); });

  afterEach(async () => { await tearDownLogsReceiver(this); });

  it('Single producer', async () => {
    const testName = 'single-producer';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    await runTest(testName, async () => {
      chai.assert.isDefined(
        await utilities.getSubscriptionFilter(producerLogGroup, this.logsReceiverArn),
      );
      chai.assert.isDefined(await utilities.getFunctionPolicy(this.logsReceiverName));
    });
  });

  it('Multiple producers', async () => {
    const testName = 'multiple-producers';
    const logsProducer1Name = utilities.getFunctionName(testName, 'test', 'logs-producer-1');
    const logsProducer2Name = utilities.getFunctionName(testName, 'test', 'logs-producer-2');
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    await runTest(testName, async () => {
      chai.assert.isDefined(
        await utilities.getSubscriptionFilter(producer1LogGroup, this.logsReceiverArn),
      );
      chai.assert.isDefined(
        await utilities.getSubscriptionFilter(producer2LogGroup, this.logsReceiverArn),
      );
    });
  });

  it('Multiple producers one disabled', async () => {
    const testName = 'multiple-one-disabled';
    const logsProducer1Name = utilities.getFunctionName(testName, 'test', 'logs-producer-1');
    const logsProducer2Name = utilities.getFunctionName(testName, 'test', 'logs-producer-2');
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    await runTest(testName, async () => {
      chai.assert.isDefined(
        await utilities.getSubscriptionFilter(producer1LogGroup, this.logsReceiverArn),
      );
      chai.assert.isUndefined(
        await utilities.getSubscriptionFilter(producer2LogGroup, this.logsReceiverArn),
      );
    });
  });

  it('Single producer stage filter pass', async () => {
    const testName = 'single-stage-pass';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    await runTest(testName, async () => {
      chai.assert.isDefined(
        await utilities.getSubscriptionFilter(producerLogGroup, this.logsReceiverArn),
      );
    });
  });

  it('Single producer stage filter fail', async () => {
    const testName = 'single-stage-fail';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    await runTest(testName, async () => {
      chai.assert.isUndefined(
        await utilities.getSubscriptionFilter(producerLogGroup, this.logsReceiverArn),
      );
    });
  });

  it('Single producer filter pattern', async () => {
    const testName = 'single-filter';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    await runTest(testName, async () => {
      const filter = await utilities.getSubscriptionFilter(producerLogGroup, this.logsReceiverArn);
      chai.assert.isDefined(filter);
      chai.assert.equal(filter.filterPattern, 'helloWorld');
    });
  });

  describe('With custom lambda permission', async () => {
    beforeEach(async () => { await setUpLambdaCustomPolicy(this); });

    it('Single producer custom lambda permission', async () => {
      const testName = 'single-permission';
      const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
      const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
      await runTest(testName, async () => {
        chai.assert.isDefined(
          await utilities.getSubscriptionFilter(producerLogGroup, this.logsReceiverArn),
        );
        const functionPolicy = await utilities.getFunctionPolicy(this.logsReceiverName);
        chai.assert.isDefined(functionPolicy);
        chai.assert.equal(functionPolicy.Statement.length, 1);
        chai.assert.equal(functionPolicy.Statement[0].Sid, this.statementId);
      });
    });
  });
});
