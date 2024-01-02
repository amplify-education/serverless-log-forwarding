import {
  AttachRolePolicyCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  IAMClient
} from "@aws-sdk/client-iam";
import { Role } from "aws-sdk/clients/iam";

const EXECUTION_POLICY_ARN = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole";
const ASSUME_ROLE_POLICY = {
  Version: "2012-10-17",
  Statement: [{
    Sid: "",
    Effect: "Allow",
    Principal: {
      Service: "lambda.amazonaws.com"
    },
    Action: "sts:AssumeRole"
  }
  ]
};

export default class IamWrap {
  private iamClient: IAMClient;

  constructor (region: string) {
    this.iamClient = new IAMClient({ region });
  }

  /**
   * Creates a role with basic lambda permissions. Returns the role.
   */
  async setupLambdaRole (roleName: string): Promise<Role> {
    const { Role } = await this.iamClient.send(new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(ASSUME_ROLE_POLICY)
    }));

    await this.iamClient.send(new AttachRolePolicyCommand({
      PolicyArn: EXECUTION_POLICY_ARN,
      RoleName: Role.RoleName
    }));

    return Role;
  }

  async removeLambdaRole (roleName: string) {
    await this.iamClient.send(new DetachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: EXECUTION_POLICY_ARN
    }));
    await this.iamClient.send(new DeleteRoleCommand({
      RoleName: roleName
    }));
  }
}
