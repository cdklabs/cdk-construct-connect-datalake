// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  BatchDisassociateAnalyticsDataSetCommandOutput,
  BatchAssociateAnalyticsDataSetCommandOutput,
  AssociateAnalyticsDataSetCommandOutput,
} from "@aws-sdk/client-connect";
import {
  batchDisassociateAnalyticsDatasets,
  batchAssociateAnalyticsDatasets,
  listAllAnalyticsDataAssociations,
  listAnalyticsDataLakeDataSets,
} from "@src/handler/services/connect-operations";

jest.mock("@aws-sdk/client-connect", () => ({
  ...jest.requireActual("@aws-sdk/client-connect"),
  ListAnalyticsDataAssociationsCommand: jest.fn().mockImplementation(() => ({})),
  BatchDisassociateAnalyticsDataSetCommand: jest.fn().mockImplementation(() => ({})),
  DisassociateAnalyticsDataSetCommand: jest.fn().mockImplementation(() => ({})),
  BatchAssociateAnalyticsDataSetCommand: jest.fn().mockImplementation(() => ({})),
  AssociateAnalyticsDataSetCommand: jest.fn().mockImplementation(() => ({})),
  ListInstancesCommand: jest.fn().mockImplementation(() => ({})),
  ListAnalyticsDataLakeDataSetsCommand: jest.fn().mockImplementation(() => ({})),
}));

const {
  BatchDisassociateAnalyticsDataSetCommand,
  DisassociateAnalyticsDataSetCommand,
  BatchAssociateAnalyticsDataSetCommand,
  AssociateAnalyticsDataSetCommand,
  ListInstancesCommand,
} = jest.requireMock("@aws-sdk/client-connect");

const mockSend = jest.fn();
const mockConnectClient = {
  send: mockSend,
} as any;

describe("Connect Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("batchDisassociateAnalyticsDatasets", () => {
    it("should disassociate datasets successfully", async () => {
      const disassociateResponse: BatchDisassociateAnalyticsDataSetCommandOutput = {
        Deleted: ["dataset1"],
        Errors: [],
        $metadata: {},
      };

      mockSend.mockResolvedValue(disassociateResponse);

      const result = await batchDisassociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(result.Success).toEqual(["dataset1"]);
      expect(result.Errors).toHaveLength(0);
      expect(BatchDisassociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetIds: ["dataset1"],
        TargetAccountId: "123456789012",
      });
      expect(DisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(0);
    });

    it("should handle batch partial success with single retry", async () => {
      const batchResponse: BatchDisassociateAnalyticsDataSetCommandOutput = {
        Deleted: ["dataset1"],
        Errors: [{ ErrorCode: "Failed", ErrorMessage: "dataset2 failed" }],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(batchResponse).mockResolvedValueOnce({ DataSetId: "dataset2" });

      const result = await batchDisassociateAnalyticsDatasets(
        "instance-id",
        ["dataset1", "dataset2"],
        "123456789012",
        mockConnectClient,
      );

      expect(result.Success).toEqual(["dataset1", "dataset2"]);
      expect(BatchDisassociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetIds: ["dataset1", "dataset2"],
        TargetAccountId: "123456789012",
      });
      expect(DisassociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetId: "dataset2",
        TargetAccountId: "123456789012",
      });
      expect(DisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
    });

    it("should handle single disassociate failure", async () => {
      mockSend.mockRejectedValueOnce(new Error("Batch failed")).mockRejectedValueOnce(new Error("Single failed"));

      const result = await batchDisassociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(result.Success).toHaveLength(0);
      expect(BatchDisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(DisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(result.Errors).toHaveLength(1);
      expect(result.Errors[0]).toEqual({
        resourceId: "dataset1",
        error: "Single failed",
      });
    });

    it("should handle undefined Deleted response", async () => {
      const disassociateResponse: BatchDisassociateAnalyticsDataSetCommandOutput = {
        Errors: [],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(disassociateResponse).mockResolvedValueOnce({ DataSetId: "dataset1" });

      const result = await batchDisassociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(BatchDisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(DisassociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(result.Success).toEqual(["dataset1"]);
    });
  });

  describe("batchAssociateAnalyticsDatasets", () => {
    it("should associate datasets successfully", async () => {
      const mockCreated = [
        {
          DataSetId: "dataset1",
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share:test",
        },
      ];
      const associateResponse: BatchAssociateAnalyticsDataSetCommandOutput = {
        Created: mockCreated,
        Errors: [],
        $metadata: {},
      };
      mockSend.mockResolvedValue(associateResponse);

      const result = await batchAssociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(result.Created).toEqual(mockCreated);
      expect(result.Errors).toHaveLength(0);
      expect(BatchAssociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetIds: ["dataset1"],
        TargetAccountId: "123456789012",
      });
      expect(AssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(0);
    });

    it("should handle batch partial success with single retry", async () => {
      const batchResponse: BatchAssociateAnalyticsDataSetCommandOutput = {
        Created: [
          {
            DataSetId: "dataset1",
            ResourceShareArn: "arn:aws:ram::123456789012:resource-share:test1",
          },
        ],
        Errors: [{ ErrorCode: "Failed", ErrorMessage: "dataset2 failed" }],
        $metadata: {},
      };
      const singleResponse: AssociateAnalyticsDataSetCommandOutput = {
        DataSetId: "dataset2",
        ResourceShareArn: "arn:aws:ram::123456789012:resource-share:test2",
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(batchResponse).mockResolvedValueOnce(singleResponse);

      const result = await batchAssociateAnalyticsDatasets(
        "instance-id",
        ["dataset1", "dataset2"],
        "123456789012",
        mockConnectClient,
      );

      expect(result.Created).toHaveLength(2);
      expect(BatchAssociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetIds: ["dataset1", "dataset2"],
        TargetAccountId: "123456789012",
      });
      expect(AssociateAnalyticsDataSetCommand).toHaveBeenCalledWith({
        InstanceId: "instance-id",
        DataSetId: "dataset2",
        TargetAccountId: "123456789012",
      });
      expect(AssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
    });

    it("should handle single associate failure", async () => {
      mockSend.mockRejectedValueOnce(new Error("Batch failed")).mockRejectedValueOnce(new Error("Single failed"));

      const result = await batchAssociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(BatchAssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(AssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(result.Created).toHaveLength(0);
      expect(result.Errors).toHaveLength(1);
      expect(result.Errors[0]).toEqual({
        resourceId: "dataset1",
        error: "Single failed",
      });
    });

    it("should handle undefined Created response", async () => {
      const associateResponse: BatchAssociateAnalyticsDataSetCommandOutput = {
        Errors: [],
        $metadata: {},
      };
      const singleResponse: AssociateAnalyticsDataSetCommandOutput = {
        DataSetId: "dataset1",
        ResourceShareArn: "arn:aws:ram::123456789012:resource-share:test",
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(associateResponse).mockResolvedValueOnce(singleResponse);

      const result = await batchAssociateAnalyticsDatasets(
        "instance-id",
        ["dataset1"],
        "123456789012",
        mockConnectClient,
      );

      expect(BatchAssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(AssociateAnalyticsDataSetCommand).toHaveBeenCalledTimes(1);
      expect(result.Created).toHaveLength(1);
    });
  });

  describe("listAnalyticsDataLakeDataSets", () => {
    it("should return dataset IDs", async () => {
      mockSend.mockResolvedValue({
        Results: [{ DataSetId: "dataset1" }, { DataSetId: "dataset2" }],
        $metadata: {},
      });

      const result = await listAnalyticsDataLakeDataSets("instance-id", mockConnectClient);

      expect(result).toEqual(new Set(["dataset1", "dataset2"]));
    });

    it("should handle pagination", async () => {
      mockSend
        .mockResolvedValueOnce({ Results: [{ DataSetId: "dataset1" }], NextToken: "token", $metadata: {} })
        .mockResolvedValueOnce({ Results: [{ DataSetId: "dataset2" }], $metadata: {} });

      const result = await listAnalyticsDataLakeDataSets("instance-id", mockConnectClient);

      expect(result).toEqual(new Set(["dataset1", "dataset2"]));
    });
  });

  describe("listAllAnalyticsDataAssociations", () => {
    it("should list associations for all instances", async () => {
      const instancesResponse = {
        InstanceSummaryList: [{ Id: "instance1" }, { Id: "instance2" }],
        $metadata: {},
      };
      const associationsResponse1 = {
        Results: [{ DataSetId: "dataset1", TargetAccountId: "123456789012" }],
        $metadata: {},
      };
      const associationsResponse2 = {
        Results: [{ DataSetId: "dataset2", TargetAccountId: "123456789012" }],
        $metadata: {},
      };

      mockSend
        .mockResolvedValueOnce(instancesResponse)
        .mockResolvedValueOnce(associationsResponse1)
        .mockResolvedValueOnce(associationsResponse2);

      const result = await listAllAnalyticsDataAssociations(mockConnectClient, "123456789012");

      expect(result.size).toBe(2);
      expect(result.get("instance1")).toEqual(["dataset1"]);
      expect(result.get("instance2")).toEqual(["dataset2"]);
      expect(ListInstancesCommand).toHaveBeenCalledWith({});
    });

    it("should throw error for instances without ID", async () => {
      const instancesResponse = {
        InstanceSummaryList: [{ Id: "instance1" }, {}],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(instancesResponse).mockResolvedValueOnce({ Results: [], $metadata: {} });

      await expect(listAllAnalyticsDataAssociations(mockConnectClient, "123456789012")).rejects.toThrow(
        "InstanceID is missing for instance",
      );
    });

    it("should filter associations by target account and handle missing DataSetId", async () => {
      const instancesResponse = {
        InstanceSummaryList: [{ Id: "instance1" }],
        $metadata: {},
      };
      const associationsResponse = {
        Results: [
          { DataSetId: "dataset1", TargetAccountId: "123456789012" },
          { DataSetId: "dataset2", TargetAccountId: "999999999999" },
        ],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(instancesResponse).mockResolvedValueOnce(associationsResponse);

      const result = await listAllAnalyticsDataAssociations(mockConnectClient, "123456789012");

      expect(result.get("instance1")).toEqual(["dataset1"]);
    });

    it("should throw error when DataSetId is missing", async () => {
      const instancesResponse = {
        InstanceSummaryList: [{ Id: "instance1" }],
        $metadata: {},
      };
      const associationsResponse = {
        Results: [{ TargetAccountId: "123456789012" }],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(instancesResponse).mockResolvedValueOnce(associationsResponse);

      await expect(listAllAnalyticsDataAssociations(mockConnectClient, "123456789012")).rejects.toThrow(
        "DataSetId or TargetAccountId is missing for association",
      );
    });

    it("should handle undefined InstanceSummaryList", async () => {
      const instancesResponse = {
        $metadata: {},
      };

      mockSend.mockResolvedValue(instancesResponse);

      const result = await listAllAnalyticsDataAssociations(mockConnectClient, "123456789012");

      expect(result.size).toBe(0);
    });

    it("should throw error when listing instances fails", async () => {
      mockSend.mockRejectedValue(new Error("Failed"));

      await expect(listAllAnalyticsDataAssociations(mockConnectClient, "123456789012")).rejects.toThrow(
        "Failed to list all associations. Failed",
      );
    });

    it("should throw error when listing associations for an instance fails", async () => {
      const instancesResponse = {
        InstanceSummaryList: [{ Id: "instance1" }],
        $metadata: {},
      };

      mockSend.mockResolvedValueOnce(instancesResponse).mockRejectedValueOnce(new Error("List failed"));

      await expect(listAllAnalyticsDataAssociations(mockConnectClient, "123456789012")).rejects.toThrow(
        "Failed to list all associations. List failed",
      );
    });
  });
});
