// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AssumeRoleCommandOutput } from "@aws-sdk/client-sts";
import { createAwsClients } from "@src/handler/utils/aws-clients";

const mockSendSTS = jest.fn();

jest.mock("@aws-sdk/client-sts", () => ({
  STSClient: jest.fn().mockImplementation(() => ({
    send: mockSendSTS,
  })),
  AssumeRoleCommand: jest.fn(),
}));
jest.mock("@aws-sdk/client-glue");
jest.mock("@aws-sdk/client-lakeformation");
jest.mock("@aws-sdk/client-connect");
jest.mock("@aws-sdk/client-ram");

describe("AWS Clients Utils", () => {
  const lambdaAccountId = "123456789012";
  const targetAccountId = "987654321098";
  const roleArn = "arn:aws:iam::123456789012:role/test-role";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAwsClients", () => {
    it("should return same account clients when accounts match", async () => {
      const result = await createAwsClients(lambdaAccountId, lambdaAccountId, roleArn);

      expect(result.connect).toBeDefined();
      expect(result.glue).toBeDefined();
      expect(result.lakeformation).toBeDefined();
      expect(result.ram).toBeDefined();
    });

    it("should create cross-account clients for different accounts", async () => {
      const assumeRoleResponse = {
        Credentials: {
          AccessKeyId: "AccessKeyId",
          SecretAccessKey: "SecretAccessKey",
          SessionToken: "SessionToken",
        },
        $metadata: {},
      } as AssumeRoleCommandOutput;

      mockSendSTS.mockResolvedValue(assumeRoleResponse);

      const result = await createAwsClients(lambdaAccountId, targetAccountId, roleArn);

      expect(result.connect).toBeDefined();
      expect(result.glue).toBeDefined();
      expect(result.lakeformation).toBeDefined();
      expect(result.ram).toBeDefined();
      expect(mockSendSTS).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid credentials", async () => {
      const invalidResponse = {
        Credentials: {},
        $metadata: {},
      } as AssumeRoleCommandOutput;

      mockSendSTS.mockResolvedValue(invalidResponse);

      await expect(createAwsClients(lambdaAccountId, targetAccountId, roleArn)).rejects.toThrow(
        "Invalid credentials from assume role",
      );
    });

    it("should handle missing credential", async () => {
      const invalidResponse = {
        Credentials: {
          SecretAccessKey: "SecretAccessKey",
          SessionToken: "SessionToken",
        },
        $metadata: {},
      } as AssumeRoleCommandOutput;

      mockSendSTS.mockResolvedValue(invalidResponse);

      await expect(createAwsClients(lambdaAccountId, targetAccountId, roleArn)).rejects.toThrow(
        "Invalid credentials from assume role",
      );
    });
  });
});
