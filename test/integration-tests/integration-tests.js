const fs = require('fs');
const chai = require('chai');
const mocha = require('mocha');
const aws = require("aws-sdk");
const utilities = require("./test-utilities");
const base = require("./base");
const { CloudWatchLogs } = require('aws-sdk');


const expect = chai.expect;
const CONFIGS_FOLDER = "configs";
const RESOURCE_FOLDER = "resources";
const TIMEOUT_MINUTES = 15 * 60 * 1000; // 5 minutes in milliseconds

const logsReceiverName = `${base.PLUGIN_IDENTIFIER}-${base.RANDOM_STRING}-logs-receiver`;

const lambda = new aws.Lambda({apiVersion: '2015-03-31'});

async function createDummyFunction(functionName) {
    const resp = await lambda.createFunction({
      Code: {
        ZipFile: fs.readFileSync(`test/integration-tests/${RESOURCE_FOLDER}/logs-receiver.zip`)
      },
      Architectures: ["x86_64"],
      Handler: "index.handler",
      FunctionName: functionName,
      Role: "arn:aws:iam::646102706174:role/lambda_basic_execution",
      Runtime: "nodejs14.x"
    }).promise();
    return resp.FunctionArn;
}

async function ensureFunctionCreated(functionName) {
  const maxRetries = 10;
  const delayMs = 500;
  for (var retry = 1; retry <= maxRetries; retry++) {
    resp = await lambda.getFunction({FunctionName: functionName}).promise();
    if (resp.Configuration.State == "Active") {
      return;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw Error("Function initializing timeout.");
}

async function pingFunction(functionName) {
    await lambda.invoke({
      FunctionName: functionName,
      Payload: Buffer.from("{}")
    }).promise();
}


async function* resourceContext(testName) {
    const configFolder = `${CONFIGS_FOLDER}/${testName}`;
    await utilities.createResources(configFolder, testName);
    try {
      yield
    }
    finally {
      await utilities.destroyResources(testName);
    }
}

describe("Integration Tests", function () {
  this.timeout(TIMEOUT_MINUTES);

  before(async () => {
    this.logsReceiverArn = await createDummyFunction(logsReceiverName);
    process.env.LOGS_RECEIVER_ARN = this.logsReceiverArn;
    await ensureFunctionCreated(logsReceiverName);
    await pingFunction(logsReceiverName);
  });

  after(async () => {
    await lambda.deleteFunction({FunctionName: logsReceiverName}).promise();
  });

  it("Single producer", async () => {
    const testName = "single-producer";
    const logsProducerName = utilities.getFunctionName(testName, "test", "logs-producer"); 
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some(s => s.destinationArn === this.logsReceiverArn));
    }
  })

  it("Multiple producers", async () => {
    const testName = "multiple-producers";
    const logsProducer1Name = utilities.getFunctionName(testName, "test", "logs-producer-1"); 
    const logsProducer2Name = utilities.getFunctionName(testName, "test", "logs-producer-2"); 
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters1 = await utilities.getSubscriptionFilters(producer1LogGroup);
      chai.assert.isTrue(subscripionFilters1.some(s => s.destinationArn === this.logsReceiverArn));
      const subscripionFilters2 = await utilities.getSubscriptionFilters(producer2LogGroup);
      chai.assert.isTrue(subscripionFilters2.some(s => s.destinationArn === this.logsReceiverArn));
    }
  })

  it("Multiple producers one disabled", async () => {
    const testName = "multiple-producers-one-disabled";
    const logsProducer1Name = utilities.getFunctionName(testName, "test", "logs-producer-1"); 
    const logsProducer2Name = utilities.getFunctionName(testName, "test", "logs-producer-2"); 
    const producer1LogGroup = utilities.getFunctionLogGroup(logsProducer1Name);
    const producer2LogGroup = utilities.getFunctionLogGroup(logsProducer2Name);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters1 = await utilities.getSubscriptionFilters(producer1LogGroup);
      chai.assert.isTrue(subscripionFilters1.some(s => s.destinationArn === this.logsReceiverArn));
      const subscripionFilters2 = await utilities.getSubscriptionFilters(producer2LogGroup);
      chai.assert.isTrue(!subscripionFilters2.some(s => s.destinationArn === this.logsReceiverArn));
    }
  })

  it("Single producer stage filter pass", async () => {
    const testName = "single-producer-stage-filter-pass";
    const logsProducerName = utilities.getFunctionName(testName, "test", "logs-producer"); 
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(subscripionFilters.some(s => s.destinationArn === this.logsReceiverArn));
    }
  })

  it("Single producer stage filter fail", async () => {
    const testName = "single-producer-stage-filter-fail";
    const logsProducerName = utilities.getFunctionName(testName, "test", "logs-producer"); 
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(!subscripionFilters.some(s => s.destinationArn === this.logsReceiverArn));
    }
  })

  it("Single producer filter pattern", async () => {
    const testName = "single-producer-filter-pattern";
    const logsProducerName = utilities.getFunctionName(testName, "test", "logs-producer"); 
    const producerLogGroup = utilities.getFunctionLogGroup(logsProducerName);
    for await (const _ of resourceContext(testName)) {
      const subscripionFilters = await utilities.getSubscriptionFilters(producerLogGroup);
      chai.assert.isTrue(!subscripionFilters.some(s => s.destinationArn === this.logsReceiverArn && 
                                                       s.filterPattern === "^(hello)*.*(bye)*$"));
    }
  })
})
