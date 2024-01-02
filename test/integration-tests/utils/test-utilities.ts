import * as shell from "shelljs";
import { PLUGIN_IDENTIFIER, RANDOM_STRING, TEMP_DIR } from "../base";

/**
 * Executes given shell command.
 */
async function exec (cmd: string): Promise<string> {
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
async function createTempDir (tempDir: string, folderName: string) {
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
function slsDeploy (tempDir: string): Promise<string> {
  return exec(`cd ${tempDir} && npx serverless deploy`);
}

/**
 * Runs `sls remove` for the given folder
 */
function slsRemove (tempDir: string): Promise<string> {
  return exec(`cd ${tempDir} && npx serverless remove`);
}

/**
 * Wraps creation of testing resources.
 */
export async function createResources (folderName: string, testName: string): Promise<void> {
  console.debug(`\tCreating Resources for ${testName} \tUsing tmp directory ${TEMP_DIR}`);
  try {
    await createTempDir(TEMP_DIR, folderName);
    await slsDeploy(TEMP_DIR);
    console.debug("\tResources Created");
  } catch (e) {
    console.debug("\tResources Failed to Create");
  }
}

/**
 * Wraps deletion of testing resources.
 */
export async function destroyResources (testName: string): Promise<void> {
  try {
    console.debug(`\tCleaning Up Resources for ${testName}`);
    await slsRemove(TEMP_DIR);
    await exec(`rm -rf ${TEMP_DIR}`);
    console.debug("\tResources Cleaned Up");
  } catch (e) {
    console.debug("\tFailed to Clean Up Resources");
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
export function getLogGroup (testName: string, stage: string, functionId: string): string {
  const functionName = `${PLUGIN_IDENTIFIER}-${testName}-${RANDOM_STRING}-${stage}-${functionId}`;
  return `/aws/lambda/${functionName}`;
}

export async function runTest (testName: string, assertFunc): Promise<void> {
  try {
    const configFolder = `configs/${testName}`;
    await createResources(configFolder, testName);
    await assertFunc();
  } finally {
    await destroyResources(testName);
  }
}
