// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { join } from "path";
import { Duration, CustomResource, CfnOutput, Stack, Annotations, Token } from "aws-cdk-lib";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { DataType } from "./data-types";

export * from "./data-types";

/**
 * Properties for the DataLakeAccess construct
 */
export interface DataLakeAccessProps {
  /**
   * The identifier of the Amazon Connect instance
   */
  readonly instanceId: string;

  /**
   * Array of dataset IDs to associate with the Connect instance
   *
   * Can include DataType enum values or string dataset IDs
   */
  readonly datasetIds: Array<string | DataType>;

  /**
   * The identifier of the target account
   *
   * If not specified, defaults to the current AWS account. For cross-account setups,
   * specify an external account ID to associate datasets and create resources in that account
   *
   * When specified with an external account, `targetAccountRoleArn` is also required
   */
  readonly targetAccountId?: string;

  /**
   * The IAM role ARN in the target account for cross-account role assumption
   *
   * Only required when `targetAccountId` is specified with an external account. A template
   * for the required permissions can be found in the [Cross Account Setup](../CROSS_ACCOUNT_SETUP.md) documentation
   */
  readonly targetAccountRoleArn?: string;
}

/**
 * Automates Amazon Connect Data Lake integration setup and management.
 *
 * This construct simplifies the process of associating Amazon Connect analytics datasets with AWS data lake services,
 * handling resource sharing, Lake Formation permissions, and data catalog management through a centralized Glue database.
 */
export class DataLakeAccess extends Construct {
  private static readonly DATABASE_NAME = "connect_datalake_database";

  /**
   * @param scope Parent to which the Custom Resource belongs
   * @param id Unique identifier for this instance
   * @param props Metadata for configuring the Custom Resource
   */
  constructor(scope: Construct, id: string, props: DataLakeAccessProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const partition = stack.partition;
    const region = stack.region;
    const account = stack.account;
    const stackName = stack.stackName;
    const targetAccount: string = props.targetAccountId ?? account;
    const isCrossAccountDeployment: boolean = targetAccount !== account;

    this.validateProps(props, isCrossAccountDeployment);

    // Used to manage change in targetAccountId scenarios
    const targetAccountIdSuffix = isCrossAccountDeployment ? `${props.targetAccountId}` : "";

    /**
     * Lambda function that handles the data lake setup and teardown process
     * This function orchestrates the entire Connect data lake integration workflow
     */
    const dataLakeLambda = new Function(this, `DataLakeHandler${targetAccountIdSuffix}`, {
      runtime: Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: Code.fromAsset(join(__dirname, "..", "lib", "handler")),
      memorySize: 512,
      timeout: Duration.minutes(15),
    });

    const roleArn = isCrossAccountDeployment ? props.targetAccountRoleArn! : dataLakeLambda.role!.roleArn;
    this.configureLambdaPermissions(
      dataLakeLambda,
      partition,
      region,
      account,
      stackName,
      isCrossAccountDeployment,
      roleArn,
    );

    /**
     * Custom resource provider that manages the Lambda function lifecycle
     */
    const dataLakeProvider = new Provider(this, `DataLakeProvider${targetAccountIdSuffix}`, {
      onEventHandler: dataLakeLambda,
    });

    /**
     * Custom resource that triggers the data lake setup process during CloudFormation stack lifecycle events
     */
    const dataLakeCustomResource = new CustomResource(this, `DataLakeCustomResource${targetAccountIdSuffix}`, {
      serviceToken: dataLakeProvider.serviceToken,
      properties: {
        instanceId: props.instanceId,
        datasetIds: props.datasetIds.map((d) => String(d)),
        roleArn: roleArn,
        lambdaAccountId: account,
        targetAccountId: targetAccount,
        timeStamp: Date.now().toString(), // Force update even if input properties do not change
        constructId: id,
      },
    });

    /**
     * CloudFormation output containing custom resource lambda errors
     */
    new CfnOutput(this, "Errors", {
      value: dataLakeCustomResource.getAttString("errors"),
      exportName: `${id}Errors`,
    });
    Annotations.of(this).addWarning(
      `DataLakeAccess reports setup errors via the stack output. ` +
        `Check output '${id}Errors' after each deployment to verify the setup completed successfully.`,
    );
  }

  /**
   * Validates the construct input parameters
   *
   * @param props The construct properties to validate
   * @param isCrossAccountDeployment Indicates if target account differs from current account
   */
  private validateProps(props: DataLakeAccessProps, isCrossAccountDeployment: boolean): void {
    const errors: string[] = [];

    if (
      !Token.isUnresolved(props.instanceId) &&
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(props.instanceId)
    ) {
      errors.push("instanceId must be a valid UUID format");
    }

    if (props.datasetIds.length === 0) {
      errors.push("datasetIds cannot be empty");
    }

    if (
      props.targetAccountId &&
      !Token.isUnresolved(props.targetAccountId) &&
      !/^\d{12}$/.test(props.targetAccountId)
    ) {
      errors.push("targetAccountId must be a 12-digit AWS account ID");
    }

    if (isCrossAccountDeployment && !props.targetAccountRoleArn) {
      errors.push("targetAccountRoleArn is required when targetAccountId differs from current account");
    }
    if (!isCrossAccountDeployment && props.targetAccountRoleArn) {
      errors.push("targetAccountRoleArn should not be specified without targetAccountId");
    }

    if (
      props.targetAccountRoleArn &&
      !Token.isUnresolved(props.targetAccountRoleArn) &&
      !/^arn:(aws|aws-us-gov):iam::\d{12}:role\/[\w+=,.@/-]+$/.test(props.targetAccountRoleArn)
    ) {
      errors.push("targetAccountRoleArn must be a valid IAM role ARN");
    }

    if (errors.length > 0) {
      errors.forEach((error) => Annotations.of(this).addError(error));
      throw new Error(`DataLakeAccess validation failed: ${errors.join("; ")}`);
    }
  }

  /**
   * Configures Lambda permissions for same-account or cross-account deployments
   *
   * @param lambdaFunction The Lambda function to configure permissions for
   * @param partition AWS partition for resource ARN construction
   * @param region AWS region for resource ARN construction
   * @param account Current account ID where the Connect instance resides
   * @param stackName Name of the CloudFormation stack
   * @param isCrossAccountDeployment Indicates if target account differs from current account
   * @param roleArn Role ARN used for cross-account deployments
   */
  private configureLambdaPermissions(
    lambdaFunction: Function,
    partition: string,
    region: string,
    account: string,
    stackName: string,
    isCrossAccountDeployment: boolean,
    roleArn: string,
  ): void {
    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "connect:BatchAssociateAnalyticsDataSet",
          "connect:BatchDisassociateAnalyticsDataSet",
          "connect:AssociateAnalyticsDataSet",
          "connect:DisassociateAnalyticsDataSet",
          "connect:ListAnalyticsDataAssociations",
          "connect:ListAnalyticsDataLakeDataSets",
        ],
        resources: [`arn:${partition}:connect:${region}:${account}:instance/*`],
      }),
    );

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["connect:ListInstances"],
        resources: [`arn:${partition}:connect:${region}:${account}:*`],
      }),
    );

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ds:DescribeDirectories"],
        resources: [`*`],
      }),
    );

    lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudformation:DescribeStacks"],
        resources: [`arn:${partition}:cloudformation:${region}:${account}:stack/${stackName}/*`],
      }),
    );

    // Allow assuming ConnectDataLakeRole for cross-account operations
    if (isCrossAccountDeployment) {
      lambdaFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [roleArn],
        }),
      );
    } else {
      lambdaFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ram:GetResourceShareInvitations", "ram:GetResourceShares", "ram:ListResources"],
          resources: ["*"],
        }),
      );

      lambdaFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ram:AcceptResourceShareInvitation"],
          resources: [`arn:${partition}:ram:${region}:*:resource-share-invitation/*`],
        }),
      );

      lambdaFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lakeformation:GetDataLakeSettings", "lakeformation:PutDataLakeSettings"],
          resources: ["*"],
        }),
      );

      lambdaFunction.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "glue:GetDatabase",
            "glue:CreateDatabase",
            "glue:DeleteDatabase",
            "glue:CreateTable",
            "glue:DeleteTable",
            "glue:GetTables",
          ],
          resources: [
            `arn:${partition}:glue:${region}:${account}:database/${DataLakeAccess.DATABASE_NAME}`,
            `arn:${partition}:glue:${region}:${account}:table/${DataLakeAccess.DATABASE_NAME}/*`,
            `arn:${partition}:glue:${region}:${account}:userDefinedFunction/${DataLakeAccess.DATABASE_NAME}/*`,
            `arn:${partition}:glue:${region}:${account}:catalog`,
          ],
        }),
      );
    }
  }
}
