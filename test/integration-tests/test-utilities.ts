import * as aws from 'aws-sdk';
import * as shell from 'shelljs';
import * as base from './base';
import { SubscripionFilter, Policy } from './types';

aws.config.update({ region: 'us-west-2' });
const logs = new aws.CloudWatchLogs();
const lambda = new aws.Lambda({ apiVersion: '2015-03-31' });

/**
 * Executes given shell command.
 */
async function exec(cmd: string): Promise<string> {
  console.debug(`\tRunning command: ${cmd}`);
  return new Promise((resolve, reject) => {
    shell.exec(cmd, { silent: false }, (errorCode, stdout, stderr) => {
      if (errorCode === 0) {
        return resolve(stdout);
      }
      return reject(stderr);
    });
  });
}

/**
 * Move item in folderName to created tempDir
 */
async function createTempDir(tempDir: string, folderName: string) {
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
 */
function slsDeploy(tempDir: string): Promise<string> {
  return exec(`cd ${tempDir} && serverless deploy`);
}

/**
 * Runs `sls remove` for the given folder
 */
function slsRemove(tempDir: string): Promise<string> {
  return exec(`cd ${tempDir} && serverless remove`);
}

/**
 * Wraps creation of testing resources.
 */
export async function createResources(folderName: string, testName: string): Promise<void> {
  console.debug(`\tCreating Resources for ${testName} \tUsing tmp directory ${base.TEMP_DIR}`);
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
 */
export async function destroyResources(testName: string): Promise<void> {
  try {
    console.debug(`\tCleaning Up Resources for ${testName}`);
    await slsRemove(base.TEMP_DIR);
    await exec(`rm -rf ${base.TEMP_DIR}`);
    console.debug('\tResources Cleaned Up');
  } catch (e) {
    console.debug('\tFailed to Clean Up Resources');
  }
}

/**
 * Returns all subscription filters for a given log group.
 */
export async function getSubscriptionFilters(logGroupName: string): Promise<SubscripionFilter[]> {
  const resp = await logs.describeSubscriptionFilters({ logGroupName }).promise();
  return resp.subscriptionFilters as SubscripionFilter[];
}

/**
 * Looks up in a log group for a subscription filter with a given desitnationArn.
 */
export async function getSubscriptionFilter(
  logGroupName: string,
  destinationArn: string,
): Promise<SubscripionFilter | null> {
  const subscripionFilters = await getSubscriptionFilters(logGroupName);
  const filter = subscripionFilters.find((s) => s.destinationArn === destinationArn);
  if (filter === undefined) {
    return null;
  }
  return filter;
}

/**
 * Looks up for a lambda policy.
 */
export async function getFunctionPolicy(functionName: string): Promise<Policy | null> {
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

/**
 * Returns a name of a CloudWatch log group of a function by it's
 * sls identifier.
 *
 * @param testName - name of a sls config
 * @param stage - deployment stage of sls
 * @param functionId - sls identifier of a function
 * @returns name of a function's log group
 */
export function getLogGroup(testName: string, stage: string, functionId: string): string {
  const functionName = `${base.PLUGIN_IDENTIFIER}-${testName}-${base.RANDOM_STRING}-${stage}-${functionId}`;
  return `/aws/lambda/${functionName}`;
}
