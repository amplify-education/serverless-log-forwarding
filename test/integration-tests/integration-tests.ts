import { assert } from "chai";
import * as utils from "./utils/test-utilities";
import LogReceiver from "./utils/log-receiver";
import type { LogsReceiverData } from "./utils/log-receiver";
import { PLUGIN_IDENTIFIER, RANDOM_STRING } from "./base";
import LambdaWrap from "./utils/aws/lambda-wrap";
import LogWrap from "./utils/aws/log-wrap";

const region = "us-west-2";
const logReceiver = new LogReceiver(region, `${PLUGIN_IDENTIFIER}-${RANDOM_STRING}`);
const lambdaWrap = new LambdaWrap(region);
const logWrap = new LogWrap(region);

const testTimeOutMinutes = 15;
describe("Integration Tests", function () {
  this.timeout(testTimeOutMinutes * 60 * 1000);

  let logsReceiverFixture: LogsReceiverData;

  beforeEach(async () => {
    logsReceiverFixture = await logReceiver.setUpLogsReceiver();
    process.env.LOGS_RECEIVER_ARN = logsReceiverFixture.functionArn;
  });

  afterEach(async () => {
    await logReceiver.tearDownLogsReceiver();
  });

  it("Single producer", async () => {
    const testName = "single-producer";
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, "test", "logs-producer");
    await utils.runTest(testName, async () => {
      assert.isNotNull(await logWrap.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNotNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  it("Multiple producers", async () => {
    const testName = "multiple-producers";
    const logGroup1 = utils.getLogGroup(testName, "test", "logs-producer-1");
    const logGroup2 = utils.getLogGroup(testName, "test", "logs-producer-2");
    const receiverArn = logsReceiverFixture.functionArn;
    await utils.runTest(testName, async () => {
      assert.isNotNull(await logWrap.getSubscriptionFilter(logGroup1, receiverArn));
      assert.isNotNull(await logWrap.getSubscriptionFilter(logGroup2, receiverArn));
      assert.isNotNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  it("Multiple producers one disabled", async () => {
    const testName = "multiple-one-disabled";
    const logGroup1 = utils.getLogGroup(testName, "test", "logs-producer-1");
    const logGroup2 = utils.getLogGroup(testName, "test", "logs-producer-2");
    const receiverArn = logsReceiverFixture.functionArn;
    await utils.runTest(testName, async () => {
      assert.isNotNull(await logWrap.getSubscriptionFilter(logGroup1, receiverArn));
      assert.isNull(await logWrap.getSubscriptionFilter(logGroup2, receiverArn));
      assert.isNotNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  it("Single producer stage filter pass", async () => {
    const testName = "stage-match";
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, "test", "logs-producer");
    await utils.runTest(testName, async () => {
      assert.isNotNull(await logWrap.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNotNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  it("Single producer stage filter fail", async () => {
    const testName = "stage-no-match";
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, "test", "logs-producer");
    await utils.runTest(testName, async () => {
      assert.isNull(await logWrap.getSubscriptionFilter(producerLogGroup, receiverArn));
      assert.isNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  it("Single producer filter pattern", async () => {
    const testName = "single-filter";
    const receiverArn = logsReceiverFixture.functionArn;
    const producerLogGroup = utils.getLogGroup(testName, "test", "logs-producer");
    await utils.runTest(testName, async () => {
      const filter = await logWrap.getSubscriptionFilter(producerLogGroup, receiverArn);
      assert.isNotNull(filter);
      assert.equal(filter.filterPattern, "helloWorld");
      assert.isNotNull(await lambdaWrap.getFunctionPolicy(receiverArn));
    });
  });

  describe("With custom lambda permission", async () => {
    const statementId = `invokeLambdaStatement${RANDOM_STRING}`;

    beforeEach(async () => {
      await lambdaWrap.setUpCustomPolicy(logsReceiverFixture.functionName, statementId);
    });

    afterEach(async () => {
      await lambdaWrap.tearDownCustomPolicy(logsReceiverFixture.functionName, statementId);
    });

    it("Single producer custom lambda permission", async () => {
      const testName = "create-perm-off";
      const receiverArn = logsReceiverFixture.functionArn;
      const receiverName = logsReceiverFixture.functionName;
      const producerLogGroup = utils.getLogGroup(testName, "test", "logs-producer");
      await utils.runTest(testName, async () => {
        assert.isNotNull(await logWrap.getSubscriptionFilter(producerLogGroup, receiverArn));
        const functionPolicy = await lambdaWrap.getFunctionPolicy(receiverName);
        assert.isNotNull(functionPolicy);
        assert.equal(functionPolicy.Statement.length, 1);
        assert.equal(functionPolicy.Statement[0].Sid.toString(), statementId);
      });
    });
  });
});
