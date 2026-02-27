// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetDataLakeSettingsCommandOutput } from "@aws-sdk/client-lakeformation";
import {
  setupLakeFormationPermissions,
  removeLakeFormationPermissions,
} from "@src/handler/services/lakeformation-operations";

jest.mock("@aws-sdk/client-lakeformation", () => {
  const mockPutCommand = jest.fn();
  return {
    ...jest.requireActual("@aws-sdk/client-lakeformation"),
    PutDataLakeSettingsCommand: mockPutCommand,
  };
});

const { PutDataLakeSettingsCommand } = jest.requireMock("@aws-sdk/client-lakeformation");

const mockSend = jest.fn();
const mockLakeFormationClient = {
  send: mockSend,
} as any;

interface MockError extends Error {
  name: string;
  code?: string;
}

describe("LakeFormation Service", () => {
  const roleArn = "arn:aws:iam::123456789012:role/TestRole";

  beforeEach(() => {
    jest.clearAllMocks();
    PutDataLakeSettingsCommand.mockClear();
  });

  describe("setupPermissions", () => {
    it("should add role as admin if not present", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {
          DataLakeAdmins: [
            {
              DataLakePrincipalIdentifier: "arn:aws:iam::123456789012:role/OtherRole",
            },
          ],
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings).mockResolvedValueOnce({});

      await setupLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(PutDataLakeSettingsCommand).toHaveBeenCalledWith({
        DataLakeSettings: {
          DataLakeAdmins: [
            {
              DataLakePrincipalIdentifier: "arn:aws:iam::123456789012:role/OtherRole",
            },
            { DataLakePrincipalIdentifier: roleArn },
          ],
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
      });
    });

    it("should skip update if role already admin", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {
          DataLakeAdmins: [{ DataLakePrincipalIdentifier: roleArn }],
        },
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings);

      await setupLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(PutDataLakeSettingsCommand).not.toHaveBeenCalled();
    });

    it("should handle empty admins list", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings).mockResolvedValueOnce({});

      await setupLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(PutDataLakeSettingsCommand).toHaveBeenCalledWith({
        DataLakeSettings: {
          DataLakeAdmins: [{ DataLakePrincipalIdentifier: roleArn }],
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
      });
    });

    it("should throw error on failure", async () => {
      mockSend.mockRejectedValue(new Error("Access denied"));

      await expect(setupLakeFormationPermissions(roleArn, mockLakeFormationClient)).rejects.toThrow(
        "Failed to setup Lake Formation permissions: Access denied",
      );
    });
  });

  describe("removePermissions", () => {
    it("should remove role from admins list", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {
          DataLakeAdmins: [
            { DataLakePrincipalIdentifier: roleArn },
            {
              DataLakePrincipalIdentifier: "arn:aws:iam::123456789012:role/OtherRole",
            },
          ],
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings).mockResolvedValueOnce({});

      await removeLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(PutDataLakeSettingsCommand).toHaveBeenCalledWith({
        DataLakeSettings: {
          DataLakeAdmins: [
            {
              DataLakePrincipalIdentifier: "arn:aws:iam::123456789012:role/OtherRole",
            },
          ],
          CreateDatabaseDefaultPermissions: [
            {
              Principal: { DataLakePrincipalIdentifier: "test" },
              Permissions: ["ALL"],
            },
          ],
        },
      });
    });

    it("should skip update if role not in admins", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {
          DataLakeAdmins: [
            {
              DataLakePrincipalIdentifier: "arn:aws:iam::123456789012:role/OtherRole",
            },
          ],
        },
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings);

      await removeLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(PutDataLakeSettingsCommand).not.toHaveBeenCalled();
    });

    it("should handle empty admins list", async () => {
      const existingSettings: GetDataLakeSettingsCommandOutput = {
        DataLakeSettings: {},
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(existingSettings);

      await removeLakeFormationPermissions(roleArn, mockLakeFormationClient);

      expect(PutDataLakeSettingsCommand).not.toHaveBeenCalled();
    });

    it("should handle permission denied errors during cleanup", async () => {
      const accessDeniedError: MockError = new Error("Access denied");
      accessDeniedError.name = "AccessDeniedException";

      mockSend.mockRejectedValue(accessDeniedError);

      await expect(removeLakeFormationPermissions(roleArn, mockLakeFormationClient)).rejects.toThrow(
        "Failed to cleanup Lake Formation permissions: Access denied",
      );
    });
  });
});
