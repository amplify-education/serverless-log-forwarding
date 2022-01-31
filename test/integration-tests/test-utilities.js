'use strict';

const fs = require('fs');
const aws = require('aws-sdk');
const shell = require('shelljs');
const base = require('./base');

aws.config.update({ region: 'us-west-2' });
const lambda = new aws.Lambda({ apiVersion: '2015-03-31' });

const RESOURCE_FOLDER = 'resources';

/**
 * Executes given shell command.
 * @param cmd shell command to execute
 * @returns {Promise<void>} Resolves if successfully executed, else rejects
 */
async function exec(cmd) {
  console.debug(`\tRunning command: ${cmd}`);
  return new Promise((resolve, reject) => {
    shell.exec(cmd, { silent: false }, (err, stdout, stderr) => {
      const error = err || stderr;
      if (error) {
        return reject(error);
      }
      return resolve(stdout);
    });
  });
}

/**
 * Move item in folderName to created tempDir
 * @param {string} tempDir
 * @param {string} folderName
 */
async function createTempDir(tempDir, folderName) {
  await exec(`rm -rf ${tempDir}`);
  await exec(`mkdir -p ${tempDir} && cp -R test/integration-tests/${folderName}/. ${tempDir}`);
  await exec(`mkdir -p ${tempDir}/node_modules/.bin`);
  await exec(`ln -s $(pwd) ${tempDir}/node_modules/`);

  await exec(`ln -s $(pwd)/node_modules/serverless ${tempDir}/node_modules/`);
  // link serverless to the bin directory so we can use $(npm bin) to get the path to serverless
  await exec(`ln -s $(pwd)/node_modules/serverless/bin/serverless.js ${tempDir}/node_modules/.bin/serverless`);
}

/**
 * Runs `sls deploy` for the given folder
 * @param tempDir
 * @returns {Promise<void>}
 */
function slsDeploy(tempDir) {
  return exec(`cd ${tempDir} && $(npm bin)/serverless deploy`);
}

/**
 * Runs `sls remove` for the given folder
 * @param tempDir
 * @returns {Promise<void>}
 */
function slsRemove(tempDir) {
  return exec(`cd ${tempDir} && $(npm bin)/serverless remove`);
}

/**
 * Wraps creation of testing resources.
 * @param folderName
 * @param url
 * @returns {Promise<void>} Resolves if successfully executed, else rejects
 */
async function createResources(folderName, url) {
  console.debug(`\tCreating Resources for ${url} \tUsing tmp directory ${base.TEMP_DIR}`);
  try {
    await createTempDir(base.TEMP_DIR, folderName);
    await slsDeploy(base.TEMP_DIR);
    console.debug('\tResources Created');
  } catch (e) {
    console.debug('\tResources Failed to Create');
  }
}

/**
 * Wraps deletion of testing resources.
 * @param url
 * @returns {Promise<void>} Resolves if successfully executed, else rejects
 */
async function destroyResources(url) {
  try {
    console.debug(`\tCleaning Up Resources for ${url}`);
    await slsRemove(base.TEMP_DIR);
    await exec(`rm -rf ${base.TEMP_DIR}`);
    console.debug('\tResources Cleaned Up');
  } catch (e) {
    console.debug('\tFailed to Clean Up Resources');
    console.debug(e);
    throw e;
  }
}

function getFunctionLogGroup(functionName) {
  return `/aws/lambda/${functionName}`;
}

function getFunctionName(testName, stage, functionIdentifier) {
  return `${base.PLUGIN_IDENTIFIER}-${testName}-${base.RANDOM_STRING}-${stage}-${functionIdentifier}`;
}

async function getSubscriptionFilters(logGroupName) {
  const logs = new aws.CloudWatchLogs();
  const resp = await logs.describeSubscriptionFilters({ logGroupName }).promise();
  return resp.subscriptionFilters;
}

async function getSubscriptionFilter(logGroupName, destinationArn) {
  const subscripionFilters = await getSubscriptionFilters(logGroupName);
  return subscripionFilters.find((s) => s.destinationArn === destinationArn);
}

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

async function deleteFunction(functionName) {
  await lambda.deleteFunction({ FunctionName: functionName }).promise();
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

async function getFunctionPolicy(functionName) {
  try {
    const resp = await lambda.getPolicy({ FunctionName: functionName }).promise();
    return JSON.parse(resp.Policy);
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') {
      return null;
    }
    throw e;
  }
}

async function createCustomPolicy(functionArn) {
  const statemenentId = `invokeLambdaStatement${base.RANDOM_STRING}`;
  await lambda.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: functionArn,
    Principal: 'logs.us-west-2.amazonaws.com',
    StatementId: statemenentId,
  }).promise();
  console.debug('\tCustom policy was created');
  return statemenentId;
}

module.exports = {
  createResources,
  destroyResources,
  getFunctionName,
  getFunctionLogGroup,
  createDummyFunction,
  ensureFunctionCreated,
  deleteFunction,
  getFunctionPolicy,
  createCustomPolicy,
  getSubscriptionFilter,
};
