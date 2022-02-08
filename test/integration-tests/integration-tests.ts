import { assert } from 'chai';
import * as utils from './test-utilities';
import { setUpLogsReceiver, tearDownLogsReceiver } from './fixtures/logs-receiver';
import type { LogsReceiverFixture } from './fixtures/logs-receiver';
import { setUpCustomPolicy, tearDownCustomPolicy } from './fixtures/custom-policy';
import type { CustomPolicyFixture } from './fixtures/custom-policy';

type AssertFunc = () => Promise<void>;

async function runTest(testName: string, assertFunc: AssertFunc): Promise<void> {
  try {
    const configFolder = `configs/${testName}`;
    await utils.createResources(configFolder, testName);
    await assertFunc();
  } finally {
    await utils.destroyResources(testName);
  }
}

// eslint-disable-next-line func-names
describe('Integration Tests', function () {
  this.timeout(15 * 60 * 1000);

  let logsReceiverFixture: LogsReceiverFixture | null = null;

  beforeEach(async () => {
    logsReceiverFixture = await setUpLogsReceiver();
    process.env.LOGS_RECEIVER_ARN = logsReceiverFixture.functionArn;
  });

  afterEach(async () => { await tearDownLogsReceiver(); });

  it('Single producer', async () => {
    const testName = 'single-producer';
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, 'test', 'logs-producer');
    await runTest(testName, async () => {
      assert.isNotNull(await utils.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNotNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  it('Multiple producers', async () => {
    const testName = 'multiple-producers';
    const logGroup1 = utils.getLogGroup(testName, 'test', 'logs-producer-1');
    const logGroup2 = utils.getLogGroup(testName, 'test', 'logs-producer-2');
    const receiverArn = logsReceiverFixture.functionArn;
    await runTest(testName, async () => {
      assert.isNotNull(await utils.getSubscriptionFilter(logGroup1, receiverArn));
      assert.isNotNull(await utils.getSubscriptionFilter(logGroup2, receiverArn));
      assert.isNotNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  it('Multiple producers one disabled', async () => {
    const testName = 'multiple-one-disabled';
    const logGroup1 = utils.getLogGroup(testName, 'test', 'logs-producer-1');
    const logGroup2 = utils.getLogGroup(testName, 'test', 'logs-producer-2');
    const receiverArn = logsReceiverFixture.functionArn;
    await runTest(testName, async () => {
      assert.isNotNull(await utils.getSubscriptionFilter(logGroup1, receiverArn));
      assert.isNull(await utils.getSubscriptionFilter(logGroup2, receiverArn));
      assert.isNotNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  it('Single producer stage filter pass', async () => {
    const testName = 'stage-match';
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, 'test', 'logs-producer');
    await runTest(testName, async () => {
      assert.isNotNull(await utils.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNotNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  it('Single producer stage filter fail', async () => {
    const testName = 'stage-no-match';
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, 'test', 'logs-producer');
    await runTest(testName, async () => {
      assert.isNull(await utils.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  it('Single producer filter pattern', async () => {
    const testName = 'single-filter';
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, 'test', 'logs-producer');
    await runTest(testName, async () => {
      const filter = await utils.getSubscriptionFilter(producerLogGroup, receiverArn);
      assert.isNotNull(filter);
      assert.equal(filter.filterPattern, 'helloWorld');
      assert.isNotNull(await utils.getFunctionPolicy(receiverArn));
    });
  });

  describe('With custom lambda permission', async () => {
    let customPolicyFixture: CustomPolicyFixture | null = null;

    beforeEach(async () => {
      customPolicyFixture = await setUpCustomPolicy(logsReceiverFixture.functionName);
    });

    afterEach(async () => {
      await tearDownCustomPolicy(logsReceiverFixture.functionName);
    });

    it('Single producer custom lambda permission', async () => {
      const testName = 'create-perm-off';
      const receiverArn = logsReceiverFixture.functionArn;
      const receiverName = logsReceiverFixture.functionName;
      const { statementId } = customPolicyFixture;
      const producerLogGroup = utils.getLogGroup(testName, 'test', 'logs-producer');
      await runTest(testName, async () => {
        assert.isNotNull(await utils.getSubscriptionFilter(producerLogGroup, receiverArn));
        const functionPolicy = await utils.getFunctionPolicy(receiverName);
        assert.isNotNull(functionPolicy);
        assert.equal(functionPolicy.Statement.length, 1);
        assert.equal(functionPolicy.Statement[0].Sid.toString(), statementId);
      });
    });
  });
});
