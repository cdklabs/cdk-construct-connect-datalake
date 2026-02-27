// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { GetTablesCommandOutput } from "@aws-sdk/client-glue";
import {
  createGlueDatabase,
  deleteGlueDatabase,
  createResourceLinkTables,
  deleteResourceLinkTables,
  getTableNames,
} from "@src/handler/services/glue-operations";

jest.mock("@src/handler/config/constants", () => ({
  LAKE_FORMATION_DATABASE_NAME: "lakeformation",
  DATALAKE_DATABASE_NAME: "datalake",
  ExpectedErrors: {
    ALREADY_EXISTS: "AlreadyExistsException",
    ENTITY_NOT_FOUND: "EntityNotFoundException",
  },
}));

jest.mock("@aws-sdk/client-glue", () => ({
  ...jest.requireActual("@aws-sdk/client-glue"),
  CreateDatabaseCommand: jest.fn().mockImplementation(() => ({})),
  DeleteDatabaseCommand: jest.fn().mockImplementation(() => ({})),
  CreateTableCommand: jest.fn().mockImplementation(() => ({})),
  DeleteTableCommand: jest.fn().mockImplementation(() => ({})),
  GetTablesCommand: jest.fn().mockImplementation(() => ({})),
}));

const { CreateDatabaseCommand, DeleteDatabaseCommand, CreateTableCommand, DeleteTableCommand, GetTablesCommand } =
  jest.requireMock("@aws-sdk/client-glue");

const mockSend = jest.fn();
const mockGlueClient = {
  send: mockSend,
} as any;

interface MockError extends Error {
  name: string;
  code?: string;
}

describe("Glue Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGlueDatabase", () => {
    it("should create database successfully", async () => {
      mockSend.mockResolvedValue({});

      await createGlueDatabase(mockGlueClient);

      expect(CreateDatabaseCommand).toHaveBeenCalledWith({
        DatabaseInput: {
          Name: "lakeformation",
          Description:
            "Database containing resource links to Connect datasets - created and managed by DataLakeAccess construct",
        },
      });
    });

    it("should handle already exists error", async () => {
      const error: MockError = new Error("Already exists");
      error.name = "AlreadyExistsException";
      mockSend.mockRejectedValue(error);

      await createGlueDatabase(mockGlueClient);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw error on unexpected failure", async () => {
      const error: MockError = new Error("Access denied");
      error.name = "AccessDeniedException";
      mockSend.mockRejectedValue(error);

      await expect(createGlueDatabase(mockGlueClient)).rejects.toThrow(
        "Failed to create lakeformation database: Access denied",
      );
    });
  });

  describe("deleteGlueDatabase", () => {
    it("should skip deletion if database has tables", async () => {
      const tablesResponse: GetTablesCommandOutput = {
        TableList: [{ Name: "table1" }],
        $metadata: {},
      };
      mockSend.mockResolvedValue(tablesResponse);

      await deleteGlueDatabase(mockGlueClient);

      expect(GetTablesCommand).toHaveBeenCalledWith({
        DatabaseName: "lakeformation",
        NextToken: undefined,
      });
      expect(DeleteDatabaseCommand).not.toHaveBeenCalled();
    });

    it("should delete empty database", async () => {
      const emptyTablesResponse: GetTablesCommandOutput = {
        TableList: [],
        $metadata: {},
      };
      mockSend.mockResolvedValueOnce(emptyTablesResponse).mockResolvedValueOnce({});

      await deleteGlueDatabase(mockGlueClient);

      expect(DeleteDatabaseCommand).toHaveBeenCalledWith({
        Name: "lakeformation",
      });
    });

    it("should handle non-existent database", async () => {
      const error: MockError = new Error("Not found");
      error.name = "EntityNotFoundException";
      mockSend.mockRejectedValue(error);

      await deleteGlueDatabase(mockGlueClient);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should throw error on unexpected failure", async () => {
      const error: MockError = new Error("Access denied");
      error.name = "AccessDeniedException";
      mockSend.mockRejectedValue(error);

      await expect(deleteGlueDatabase(mockGlueClient)).rejects.toThrow(
        "Failed to delete lakeformation database: Access denied",
      );
    });
  });

  describe("createResourceLinkTables", () => {
    it("should create multiple resource link tables", async () => {
      mockSend.mockResolvedValue({});

      const result = await createResourceLinkTables(["dataset1", "dataset2"], "123456789012", mockGlueClient);

      expect(result.Success).toEqual(["dataset1", "dataset2"]);
      expect(result.Errors).toHaveLength(0);
      expect(CreateTableCommand).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures", async () => {
      mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("Failed"));

      const result = await createResourceLinkTables(["dataset1", "dataset2"], "123456789012", mockGlueClient);

      expect(result.Success).toEqual(["dataset1"]);
      expect(result.Errors).toHaveLength(1);
      expect(result.Errors[0]).toEqual({
        resourceId: "dataset2",
        error: "Failed",
      });
    });

    it("should handle AlreadyExistsException as success", async () => {
      const alreadyExistsError: MockError = new Error("Already exists");
      alreadyExistsError.name = "AlreadyExistsException";
      mockSend.mockRejectedValue(alreadyExistsError);

      const result = await createResourceLinkTables(["dataset1"], "123456789012", mockGlueClient);

      expect(result.Success).toEqual(["dataset1"]);
      expect(result.Errors).toHaveLength(0);
    });
  });

  describe("getTableNames", () => {
    it("should return only resource link table names pointing to DATALAKE_DATABASE_NAME", async () => {
      mockSend.mockResolvedValue({
        TableList: [
          { Name: "table1", TargetTable: { DatabaseName: "datalake" } },
          { Name: "table2", TargetTable: { DatabaseName: "datalake" } },
          { Name: "table3", TargetTable: { DatabaseName: "other" } },
          { Name: "table4" },
        ],
        $metadata: {},
      });

      const result = await getTableNames(mockGlueClient);

      expect(result).toEqual(["table1", "table2"]);
    });

    it("should return empty array when database not found", async () => {
      const error: MockError = new Error("Not found");
      error.name = "EntityNotFoundException";
      mockSend.mockRejectedValue(error);

      const result = await getTableNames(mockGlueClient);

      expect(result).toEqual([]);
    });

    it("should throw error when resource link table has undefined Name", async () => {
      mockSend.mockResolvedValue({
        TableList: [{ Name: undefined, TargetTable: { DatabaseName: "datalake" } }],
        $metadata: {},
      });

      await expect(getTableNames(mockGlueClient)).rejects.toThrow("Table is missing Name property");
    });

    it("should throw error on unexpected failure", async () => {
      const error: MockError = new Error("Access denied");
      error.name = "AccessDeniedException";
      mockSend.mockRejectedValue(error);

      await expect(getTableNames(mockGlueClient)).rejects.toThrow(
        "Failed to get resource link table names: Access denied",
      );
    });
  });

  describe("deleteResourceLinkTables", () => {
    it("should delete specified tables", async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteResourceLinkTables(mockGlueClient, new Set(["table1", "table2"]));

      expect(result.Success).toEqual(["table1", "table2"]);
      expect(DeleteTableCommand).toHaveBeenCalledTimes(2);
    });

    it("should handle table not found during deletion", async () => {
      const notFoundError: MockError = new Error("Table not found");
      notFoundError.name = "EntityNotFoundException";
      mockSend.mockRejectedValue(notFoundError);

      const result = await deleteResourceLinkTables(mockGlueClient, new Set(["table1"]));

      expect(result.Success).toEqual(["table1"]);
      expect(result.Errors).toHaveLength(0);
    });

    it("should handle table deletion failure", async () => {
      const deleteError: MockError = new Error("Access denied");
      deleteError.name = "AccessDeniedException";
      mockSend.mockRejectedValue(deleteError);

      const result = await deleteResourceLinkTables(mockGlueClient, new Set(["table1"]));

      expect(result.Success).toHaveLength(0);
      expect(result.Errors).toHaveLength(1);
      expect(result.Errors[0]).toEqual({
        resourceId: "table1",
        error: "Access denied",
      });
    });
  });
});
