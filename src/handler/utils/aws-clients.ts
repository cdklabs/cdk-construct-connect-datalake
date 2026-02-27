// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConnectClient } from "@aws-sdk/client-connect";
import { GlueClient } from "@aws-sdk/client-glue";
import { LakeFormationClient } from "@aws-sdk/client-lakeformation";
import { RAMClient } from "@aws-sdk/client-ram";
import { STSClient, AssumeRoleCommand, AssumeRoleCommandOutput } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

/**
 * AWS service clients for Connect data lake integration operations
 */
export interface AwsClients {
  /**
   * Amazon Connect client for managing Connect analytics dataset associations
   * */
  connect: ConnectClient;

  /**
   * AWS Glue client for managing Glue Data Catalog databases and resource link tables
   * */
  glue: GlueClient;

  /**
   * Lake Formation client for managing data lake settings and permissions
   * */
  lakeformation: LakeFormationClient;

  /**
   * Resource Access Manager client for accepting resource share invitations
   * */
  ram: RAMClient;
}

/**
 * Creates AWS service clients for source and target accounts
 *
 * @param lambdaAccountId - AWS account ID where Lambda is executing
 * @param targetAccountId - AWS account ID where resources will be created
 * @param roleArn - ARN of the role to assume for operations
 * @returns AwsClients
 */
export async function createAwsClients(
  lambdaAccountId: string,
  targetAccountId: string,
  roleArn: string,
): Promise<AwsClients> {
  const config = {
    region: process.env.AWS_REGION!,
    retryMode: "adaptive",
  };

  // Same-account operations
  if (lambdaAccountId === targetAccountId) {
    return {
      connect: new ConnectClient(config),
      glue: new GlueClient(config),
      lakeformation: new LakeFormationClient(config),
      ram: new RAMClient(config),
    };
  }

  // Cross-account operations
  console.info(`Assuming cross-account role: ${roleArn}`);

  const assumeRoleResponse: AssumeRoleCommandOutput = await new STSClient(config).send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "connect-datalake-operation",
    }),
  );

  const creds = assumeRoleResponse.Credentials;
  if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
    throw new Error(`Invalid credentials from assume role`);
  }

  const credentials: AwsCredentialIdentity = {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
  };

  const targetConfig = { ...config, credentials };

  return {
    connect: new ConnectClient(config), // Association operations occur with deployment account credentials
    glue: new GlueClient(targetConfig),
    lakeformation: new LakeFormationClient(targetConfig),
    ram: new RAMClient(targetConfig),
  };
}
