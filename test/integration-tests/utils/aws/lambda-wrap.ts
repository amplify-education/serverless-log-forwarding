import { readFileSync } from "fs";
import {
  AddPermissionCommand,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  FunctionConfiguration,
  GetFunctionCommand,
  GetFunctionResponse,
  GetPolicyCommand,
  GetPolicyResponse,
  LambdaClient, RemovePermissionCommand
} from "@aws-sdk/client-lambda";
import { sleep } from "../test-utilities";

const FUNC_ZIP_PATH = "test/integration-tests/fixtures/logs-receiver.zip";
const MAX_FUNC_ACTIVE_RETRY = 3;
const FUNC_ACTIVE_TIMEOUT_SEC = 10;

export default class LambdaWrap {
  private lambdaClient: LambdaClient;

  constructor (region: string) {
    this.lambdaClient = new LambdaClient({ region });
  }

  /**
   * Creates a lambda function with basic lambda permissions.
   * Returns Arn of the created function.
   */
  async createDummyFunction (funcName: string, roleArn: string): Promise<FunctionConfiguration> {
    return await this.lambdaClient.send(new CreateFunctionCommand({
      FunctionName: funcName,
      Runtime: "nodejs18.x",
      Code: {
        ZipFile: readFileSync(FUNC_ZIP_PATH)
      },
      Architectures: ["x86_64"],
      Handler: "index.handler",
      Role: roleArn
    }));
  }

  async ensureFunctionActive (funcName: string, retry: number = 1): Promise<void> {
    if (retry > MAX_FUNC_ACTIVE_RETRY) {
      throw new Error("Max retry reached");
    }

    const resp: GetFunctionResponse = await this.lambdaClient.send(new GetFunctionCommand({
      FunctionName: funcName
    }));

    if (resp.Configuration.State !== "Active") {
      await sleep(FUNC_ACTIVE_TIMEOUT_SEC * 1000);
      await this.ensureFunctionActive(funcName, retry + 1);
    }
  }

  async removeFunction (funcName: string) {
    await this.lambdaClient.send(new DeleteFunctionCommand({
      FunctionName: funcName
    }));
  }

  async getFunctionPolicy (funcName: string): Promise<any> {
    try {
      const resp: GetPolicyResponse = await this.lambdaClient.send(new GetPolicyCommand({
        FunctionName: funcName
      }));
      return JSON.parse(resp.Policy);
    } catch (e) {
      if (e.name === "ResourceNotFoundException") {
        return null;
      }
      throw e;
    }
  }

  async setUpCustomPolicy (functionName: string, statementId: string) {
    await this.lambdaClient.send(new AddPermissionCommand({
      Action: "lambda:InvokeFunction",
      FunctionName: functionName,
      Principal: "logs.us-west-2.amazonaws.com",
      StatementId: statementId
    }));
  }

  async tearDownCustomPolicy (functionName: string, statementId: string) {
    try {
      await this.lambdaClient.send(new RemovePermissionCommand({
        FunctionName: functionName,
        StatementId: statementId
      }));
      console.debug("Custom policy was deleted");
    } catch (e) {
      console.debug("Failed to delete a custom policy");
    }
  }
}
