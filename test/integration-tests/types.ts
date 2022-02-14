export type Arn = string;

export interface SubscripionFilter {
  roleArn: Arn;
  filterName: string;
  logGroupName: string;
  creationTime: number;
  distribution: string;
  filterPattern: string;
  destinationArn: Arn;
}

export interface Statement {
  Sid: number;
}

export interface Policy {
  Statement: Statement[];
}

export interface Role {
  roleArn: Arn;
  roleName: string;
}
