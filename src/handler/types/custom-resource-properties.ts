// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Properties for Connect Data Lake custom resource handlers
 */
export interface CustomResourceProperties {
  /** Identifier of the Amazon Connect instance */
  instanceId: string;

  /** Array of dataset identifiers to associate */
  datasetIds: string[];

  /** IAM role ARN for data lake operations */
  roleArn: string;

  /** Account ID where the Lambda function executes */
  lambdaAccountId: string;

  /** Account ID where data lake resources are created */
  targetAccountId: string;

  /** Identifier given to the construct */
  constructId: string;
}
