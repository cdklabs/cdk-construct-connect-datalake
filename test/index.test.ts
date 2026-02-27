// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataLakeAccess, DataType } from "@src/index";

describe("DataLakeAccess", () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack", {
      env: { account: "111111111111", region: "us-east-1" },
    });
  });

  it("creates basic infrastructure resources", () => {
    new DataLakeAccess(stack, "TestConstruct", {
      instanceId: "12345678-1234-1234-1234-123456789012",
      datasetIds: [DataType.CONTACT_RECORD, "custom_dataset"],
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Handler: "index.handler",
    });

    template.hasResourceProperties("AWS::CloudFormation::CustomResource", {
      instanceId: "12345678-1234-1234-1234-123456789012",
      datasetIds: ["contact_record", "custom_dataset"],
    });

    template.resourceCountIs("AWS::Lambda::Function", 2);
    template.resourceCountIs("AWS::IAM::Role", 2);
    template.resourceCountIs("AWS::IAM::Policy", 2);
    template.resourceCountIs("AWS::CloudFormation::CustomResource", 1);
  });

  it("validates all input parameters with multiple errors", () => {
    expect(() => {
      new DataLakeAccess(stack, "TestConstruct", {
        instanceId: "invalid-id",
        datasetIds: [],
        targetAccountId: "invalid-account",
        targetAccountRoleArn: "invalid-arn",
      });
    }).toThrow(
      /instanceId must be a valid UUID format.*datasetIds cannot be empty.*targetAccountId must be a 12-digit AWS account ID.*targetAccountRoleArn must be a valid IAM role ARN/,
    );
  });

  it("validates targetAccountRoleArn should not be specified without targetAccountId", () => {
    expect(() => {
      new DataLakeAccess(stack, "TestConstruct", {
        instanceId: "12345678-1234-1234-1234-123456789012",
        datasetIds: [DataType.CONTACT_RECORD],
        targetAccountRoleArn: "arn:aws:iam::123456789012:role/TestRole",
      });
    }).toThrow(/targetAccountRoleArn should not be specified without targetAccountId/);
  });

  it("validates targetAccountRoleArn is required for cross-account deployment", () => {
    expect(() => {
      new DataLakeAccess(stack, "TestConstruct", {
        instanceId: "12345678-1234-1234-1234-123456789012",
        datasetIds: [DataType.CONTACT_RECORD],
        targetAccountId: "123456789012",
      });
    }).toThrow(/targetAccountRoleArn is required when targetAccountId differs from current account/);
  });

  it("creates cross-account construct with STS permissions", () => {
    new DataLakeAccess(stack, "TestConstruct", {
      instanceId: "12345678-1234-1234-1234-123456789012",
      datasetIds: [DataType.CONTACT_RECORD],
      targetAccountId: "123456789012",
      targetAccountRoleArn: "arn:aws:iam::123456789012:role/TestRole",
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: "Allow",
            Action: "sts:AssumeRole",
            Resource: "arn:aws:iam::123456789012:role/TestRole",
          },
        ]),
      },
    });
  });

  it("creates same-account construct with RAM and Lake Formation permissions", () => {
    new DataLakeAccess(stack, "TestConstruct", {
      instanceId: "12345678-1234-1234-1234-123456789012",
      datasetIds: [DataType.CONTACT_RECORD],
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: "Allow",
            Action: ["ram:GetResourceShareInvitations", "ram:GetResourceShares", "ram:ListResources"],
            Resource: "*",
          },
          {
            Effect: "Allow",
            Action: "ram:AcceptResourceShareInvitation",
            Resource: Match.anyValue(),
          },
          {
            Effect: "Allow",
            Action: ["lakeformation:GetDataLakeSettings", "lakeformation:PutDataLakeSettings"],
            Resource: "*",
          },
        ]),
      },
    });
  });
});
