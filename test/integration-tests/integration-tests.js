const chai = require('chai');
const base = require('./base');
const utilities = require('./test-utilities');

// eslint-disable-next-line func-names
describe('Integration Tests', function () {
  this.timeout(15 * 60 * 1000);

  beforeEach(async () => {
    this.logsReceiverName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver`;
    this.logsReceiverArn = await utilities.createDummyFunction(this.logsReceiverName);
    await utilities.ensureFunctionCreated(this.logsReceiverName);
    await utilities.pingFunction(this.logsReceiverName);
    process.env.LOGS_RECEIVER_ARN = this.logsReceiverArn;
  });

  afterEach(async () => {
    await utilities.deleteFunction(this.logsReceiverName);
  });

  it('Single producer', async () => {
    const testName = 'single-producer';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn));
      chai.assert.isNotNull(await utilities.getFunctionPolicy(this.logsReceiverName));
    }
  });

  it('Multiple producers', async () => {
    const testName = 'multiple-producers';
    const logsProducer1Name = utilities.getFunctionName(testName, 'test', 'logs-producer-1');
    const logsProducer2Name = utilities.getFunctionName(testName, 'test', 'logs-producer-2');
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
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
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
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
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn));
    }
  });

  it('Single producer stage filter fail', async () => {
    const testName = 'single-producer-stage-filter-fail';
    const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
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
    // eslint-disable-next-line no-unused-vars
    for await (const _ of utilities.resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some((s) => s.destinationArn === this.logsReceiverArn
                                                      && s.filterPattern === 'helloWorld'));
    }
  });

  describe('With custom lambda permission', async () => {
    beforeEach(async () => {
      this.statementId = await this.createCustomPolicy(this.logsReceiverArn);
    });

    it('Single producer custom lambda permission', async () => {
      const testName = 'single-producer-custom-permission';
      const logsProducerName = utilities.getFunctionName(testName, 'test', 'logs-producer');
      const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
      // eslint-disable-next-line no-unused-vars
      for await (const _ of utilities.resourceContext(testName)) {
        const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
        chai.assert.isTrue(subscripionFilters.some(
          (s) => s.destinationArn === this.logsReceiverArn,
        ));
        const functionPolicy = await utilities.getFunctionPolicy(this.logsReceiverName);
        chai.assert.isNotNull(functionPolicy);
        chai.assert.equal(functionPolicy.Statement.length, 1);
        chai.assert.equal(functionPolicy.Statement[0].Sid, this.statementId);
      }
    });
  });
});
