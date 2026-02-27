// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { onDelete } from "@src/handler/on-event/on-delete";
import {
  batchDisassociateAnalyticsDatasets,
  listAllAnalyticsDataAssociations,
  listAnalyticsDataLakeDataSets,
} from "@src/handler/services/connect-operations";
import { deleteResourceLinkTables, deleteGlueDatabase, getTableNames } from "@src/handler/services/glue-operations";
import { removeLakeFormationPermissions } from "@src/handler/services/lakeformation-operations";
import { listRamSharedTables } from "@src/handler/services/ram-operations";
import { CustomResourceProperties } from "@src/handler/types/custom-resource-properties";
import { createAwsClients } from "@src/handler/utils/aws-clients";

jest.mock("@src/handler/services/connect-operations");
jest.mock("@src/handler/services/glue-operations");
jest.mock("@src/handler/services/lakeformation-operations");
jest.mock("@src/handler/services/ram-operations");
jest.mock("@src/handler/utils/aws-clients");

const mockBatchDisassociateAnalyticsDataset = batchDisassociateAnalyticsDatasets as jest.MockedFunction<
  typeof batchDisassociateAnalyticsDatasets
>;
const mockListAllAnalyticsDataAssociations = listAllAnalyticsDataAssociations as jest.MockedFunction<
  typeof listAllAnalyticsDataAssociations
>;
const mockListAnalyticsDataLakeDataSets = listAnalyticsDataLakeDataSets as jest.MockedFunction<
  typeof listAnalyticsDataLakeDataSets
>;
const mockGetTableNames = getTableNames as jest.MockedFunction<typeof getTableNames>;
const mockDeleteResourceLinkTables = deleteResourceLinkTables as jest.MockedFunction<typeof deleteResourceLinkTables>;
const mockDeleteGlueDatabase = deleteGlueDatabase as jest.MockedFunction<typeof deleteGlueDatabase>;
const mockRemoveLakeFormationPermissions = removeLakeFormationPermissions as jest.MockedFunction<
  typeof removeLakeFormationPermissions
>;
const mockListRamSharedTables = listRamSharedTables as jest.MockedFunction<typeof listRamSharedTables>;
const mockCreateAwsClients = createAwsClients as jest.MockedFunction<typeof createAwsClients>;

describe("Delete Handler", () => {
  const mockClients = {
    connect: {} as any,
    glue: {} as any,
    lakeformation: {} as any,
    ram: {} as any,
  };

  const mockProps: CustomResourceProperties = {
    instanceId: "test-instance-id",
    datasetIds: ["contact_statistic_record", "contact_flow_events"],
    roleArn: "arn:aws:iam::123456789012:role/test-role",
    lambdaAccountId: "123456789012",
    targetAccountId: "987654321098",
    constructId: "construct-id",
  };

  const createMockDeleteEvent = (props: CustomResourceProperties): any => ({
    RequestType: "Delete",
    ResourceProperties: props,
    ServiceToken: "test-token",
    ResponseURL: "test-url",
    StackId: "test-stack",
    RequestId: "test-request",
    LogicalResourceId: "test-resource",
    ResourceType: "Custom::DataLakeSetup",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCreateAwsClients.mockResolvedValue(mockClients);
    mockGetTableNames.mockResolvedValue([]);
    mockListRamSharedTables.mockResolvedValue(new Set());
    mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Successful Operations", () => {
    it("should complete all delete operations successfully", async () => {
      const activeAssociations = new Map([["test-instance-id", ["dataset1", "dataset2"]]]);
      mockListAllAnalyticsDataAssociations.mockResolvedValue(activeAssociations);
      mockBatchDisassociateAnalyticsDataset.mockResolvedValue({
        Success: ["dataset1", "dataset2"],
        Errors: [],
      });
      mockGetTableNames.mockResolvedValue(["dataset1_123456789012", "dataset2_123456789012"]);
      mockListRamSharedTables.mockResolvedValue(new Set());
      mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set(["dataset1", "dataset2"]));
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: [],
        Errors: [],
      });
      mockDeleteGlueDatabase.mockResolvedValue(undefined);
      mockRemoveLakeFormationPermissions.mockResolvedValue(undefined);

      const resultPromise = onDelete(createMockDeleteEvent(mockProps));
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
      expect(mockCreateAwsClients).toHaveBeenCalledWith(
        "123456789012",
        "987654321098",
        "arn:aws:iam::123456789012:role/test-role",
      );
      expect(mockListAllAnalyticsDataAssociations).toHaveBeenCalledWith(mockClients.connect, "987654321098");
      expect(mockBatchDisassociateAnalyticsDataset).toHaveBeenCalledWith(
        "test-instance-id",
        ["dataset1", "dataset2"],
        "987654321098",
        mockClients.connect,
      );
      expect(mockDeleteResourceLinkTables).toHaveBeenCalled();
      expect(mockDeleteGlueDatabase).toHaveBeenCalledWith(mockClients.glue);
      expect(mockRemoveLakeFormationPermissions).toHaveBeenCalledWith(
        "arn:aws:iam::123456789012:role/test-role",
        mockClients.lakeformation,
      );
    });

    it("should preserve datasets from other instances", async () => {
      const activeAssociations = new Map([
        ["test-instance-id", ["dataset1", "dataset2"]],
        ["other-instance", ["dataset2", "dataset3"]],
      ]);
      mockListAllAnalyticsDataAssociations.mockResolvedValue(activeAssociations);
      mockBatchDisassociateAnalyticsDataset.mockResolvedValue({
        Success: ["dataset1", "dataset2"],
        Errors: [],
      });
      mockGetTableNames.mockResolvedValue(["dataset1_123456789012", "dataset2_123456789012", "dataset3_123456789012"]);
      mockListRamSharedTables.mockResolvedValue(new Set(["dataset2_123456789012", "dataset3_123456789012"]));
      mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set(["dataset1", "dataset2", "dataset3"]));
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: ["dataset1_123456789012"],
        Errors: [],
      });
      mockDeleteGlueDatabase.mockResolvedValue(undefined);
      mockRemoveLakeFormationPermissions.mockResolvedValue(undefined);

      const resultPromise = onDelete(createMockDeleteEvent(mockProps));
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.Status).toBe("SUCCESS");
      expect(mockDeleteResourceLinkTables).toHaveBeenCalled();
      expect(mockDeleteGlueDatabase).toHaveBeenCalled();
      expect(mockRemoveLakeFormationPermissions).toHaveBeenCalled();
    });

    it("should handle when no tables need deletion", async () => {
      const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
      const activeAssociations = new Map([["other-instance", ["dataset1", "dataset2"]]]);
      mockListAllAnalyticsDataAssociations.mockResolvedValue(activeAssociations);
      mockGetTableNames.mockResolvedValue(["dataset1_123456789012", "dataset2_123456789012"]);
      mockListRamSharedTables.mockResolvedValue(new Set(["dataset1_123456789012", "dataset2_123456789012"]));
      mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set(["dataset1", "dataset2"]));
      mockDeleteGlueDatabase.mockResolvedValue(undefined);
      mockRemoveLakeFormationPermissions.mockResolvedValue(undefined);

      const result = await onDelete(createMockDeleteEvent(mockProps));

      expect(result.Status).toBe("SUCCESS");
      expect(consoleInfoSpy).toHaveBeenCalledWith("No tables to delete from Glue database");
      expect(mockDeleteResourceLinkTables).not.toHaveBeenCalled();
      expect(mockDeleteGlueDatabase).toHaveBeenCalled();
      expect(mockRemoveLakeFormationPermissions).toHaveBeenCalled();
      consoleInfoSpy.mockRestore();
    });

    it("should handle table deletion when no associations present", async () => {
      mockListAllAnalyticsDataAssociations.mockResolvedValue(new Map());
      mockGetTableNames.mockResolvedValue(["dataset1_123456789012", "dataset2_123456789012"]);
      mockListRamSharedTables.mockResolvedValue(new Set());
      mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set(["dataset1", "dataset2"]));
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: ["dataset1_123456789012", "dataset2_123456789012"],
        Errors: [],
      });
      mockDeleteGlueDatabase.mockResolvedValue(undefined);
      mockRemoveLakeFormationPermissions.mockResolvedValue(undefined);

      const result = await onDelete(createMockDeleteEvent(mockProps));

      expect(result.Status).toBe("SUCCESS");
      expect(mockBatchDisassociateAnalyticsDataset).not.toHaveBeenCalled();
      expect(mockDeleteResourceLinkTables).toHaveBeenCalled();
      expect(mockDeleteGlueDatabase).toHaveBeenCalled();
      expect(mockRemoveLakeFormationPermissions).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw error when AWS clients setup fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockCreateAwsClients.mockRejectedValue(new Error("Failed to assume role"));

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Failed to assume role",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error when disassociation fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const activeAssociations = new Map([["test-instance-id", ["dataset1"]]]);
      mockListAllAnalyticsDataAssociations.mockResolvedValue(activeAssociations);
      mockBatchDisassociateAnalyticsDataset.mockResolvedValue({
        Success: [],
        Errors: [{ resourceId: "dataset1", error: "Access denied" }],
      });

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Failed to disassociate datasets: dataset1 - Access denied",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error on partial disassociation failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const activeAssociations = new Map([["test-instance-id", ["dataset1", "dataset2"]]]);
      mockListAllAnalyticsDataAssociations.mockResolvedValue(activeAssociations);
      mockBatchDisassociateAnalyticsDataset.mockResolvedValue({
        Success: ["dataset1"],
        Errors: [{ resourceId: "dataset2", error: "ResourceNotFoundException" }],
      });

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Failed to disassociate datasets: dataset2 - ResourceNotFoundException",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error when table deletion fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockListAllAnalyticsDataAssociations.mockResolvedValue(new Map());
      mockBatchDisassociateAnalyticsDataset.mockResolvedValue({
        Success: [],
        Errors: [],
      });
      mockGetTableNames.mockResolvedValue(["dataset1_123456789012"]);
      mockListRamSharedTables.mockResolvedValue(new Set());
      mockListAnalyticsDataLakeDataSets.mockResolvedValue(new Set(["dataset1"]));
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: [],
        Errors: [{ resourceId: "dataset1_123456789012", error: "Permission denied" }],
      });

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Failed to delete all resource link tables: dataset1_123456789012 - Permission denied",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error when database deletion fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockListAllAnalyticsDataAssociations.mockResolvedValue(new Map());
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: [],
        Errors: [],
      });
      mockDeleteGlueDatabase.mockRejectedValue(new Error("Database deletion failed"));

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Database deletion failed",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should throw error when Lake Formation permissions removal fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockListAllAnalyticsDataAssociations.mockResolvedValue(new Map());
      mockDeleteResourceLinkTables.mockResolvedValue({
        Success: [],
        Errors: [],
      });
      mockDeleteGlueDatabase.mockResolvedValue(undefined);
      mockRemoveLakeFormationPermissions.mockRejectedValue(new Error("Permission removal failed"));

      await expect(onDelete(createMockDeleteEvent(mockProps))).rejects.toThrow(
        "Critical error during delete operations. Permission removal failed",
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
