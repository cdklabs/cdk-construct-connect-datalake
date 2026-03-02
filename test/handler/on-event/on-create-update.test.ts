// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { onCreateUpdate } from "@src/handler/on-event/on-create-update";
import * as connectOperations from "@src/handler/services/connect-operations";
import * as glueOperations from "@src/handler/services/glue-operations";
import * as lakeFormationOperations from "@src/handler/services/lakeformation-operations";
import * as ramOperations from "@src/handler/services/ram-operations";
import { CustomResourceProperties } from "@src/handler/types/custom-resource-properties";
import * as awsClients from "@src/handler/utils/aws-clients";

jest.mock("@src/handler/utils/aws-clients");
jest.mock("@src/handler/services/connect-operations");
jest.mock("@src/handler/services/lakeformation-operations");
jest.mock("@src/handler/services/ram-operations");
jest.mock("@src/handler/services/glue-operations");
jest.mock("@aws-sdk/client-cloudformation");

const mockClients = { connect: {} as any, glue: {} as any, lakeformation: {} as any, ram: {} as any };
const mockProps: CustomResourceProperties = {
  instanceId: "test-instance-id",
  datasetIds: ["contact_statistic_record", "contact_flow_events"],
  roleArn: "arn:aws:iam::123456789012:role/test-role",
  lambdaAccountId: "123456789012",
  targetAccountId: "987654321098",
  constructId: "construct-id",
};
const mockOldProps: CustomResourceProperties = {
  ...mockProps,
  instanceId: "old-instance-id",
  datasetIds: ["contact_statistic_record", "agent_statistic_record"],
};

const createEvent = (props: CustomResourceProperties): any => ({
  RequestType: "Create",
  ResourceProperties: props,
  StackId: "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345",
});
const updateEvent = (props: CustomResourceProperties, oldProps: CustomResourceProperties): any => ({
  RequestType: "Update",
  ResourceProperties: props,
  OldResourceProperties: oldProps,
  StackId: "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/12345",
});

const mockSuccess = () => {
  jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({
    Created: [
      {
        DataSetId: "contact_statistic_record",
        ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
      },
      {
        DataSetId: "contact_flow_events",
        ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share2",
      },
    ],
    Errors: [],
  });
  jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
  jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
  jest.spyOn(ramOperations, "acceptRamInvitations").mockResolvedValue({
    acceptedInvitations: new Map([
      ["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["contact_statistic_record"]],
      ["arn:aws:ram:us-east-1:123456789012:resource-share/share2", ["contact_flow_events"]],
    ]),
    errors: [],
  });
  jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({
    Success: ["contact_statistic_record", "contact_flow_events"],
    Errors: [],
  });
};

describe("Create/Update Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(awsClients, "createAwsClients").mockResolvedValue(mockClients);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Create", () => {
    it("should complete handler successfully", async () => {
      mockSuccess();
      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should handle no associations created", async () => {
      jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({ Created: [], Errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Data.errors).toBe("Critical error during operations. Failed to create any dataset associations");
    });

    it("should handle no RAM requests accepted", async () => {
      jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({
        Created: [
          {
            DataSetId: "contact_statistic_record",
            ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
          },
        ],
        Errors: [],
      });
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest
        .spyOn(ramOperations, "acceptRamInvitations")
        .mockResolvedValue({ acceptedInvitations: new Map(), errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Data.errors).toBe("Critical error during operations. No RAM requests were accepted");
    });

    it("should handle no successful glue tables created", async () => {
      jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({
        Created: [
          {
            DataSetId: "contact_statistic_record",
            ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
          },
          {
            DataSetId: "contact_flow_events",
            ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
          },
        ],
        Errors: [],
      });
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest.spyOn(ramOperations, "acceptRamInvitations").mockResolvedValue({
        acceptedInvitations: new Map([
          [
            "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
            ["contact_statistic_record", "contact_flow_events"],
          ],
        ]),
        errors: [],
      });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({
        Success: [],
        Errors: [
          { resourceId: "contact_statistic_record", error: "Glue failed" },
          { resourceId: "contact_flow_events", error: "Glue failed" },
        ],
      });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Data.errors).toBe("Critical error during operations. No successful resource link tables created");
    });

    it("should collect operation errors", async () => {
      jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({
        Created: [
          {
            DataSetId: "contact_statistic_record",
            ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
          },
          {
            DataSetId: "bot_intents",
            ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1",
          },
        ],
        Errors: [{ resourceId: "contact_flow_events", error: "Assoc failed" }],
      });
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest.spyOn(ramOperations, "acceptRamInvitations").mockResolvedValue({
        acceptedInvitations: new Map([
          ["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["contact_statistic_record", "bot_intents"]],
        ]),
        errors: ["RAM error"],
      });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({
        Success: ["contact_statistic_record"],
        Errors: [{ resourceId: "bot_intents", error: "Glue failed" }],
      });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Data.errors).toContain("Association failures");
      expect(result.Data.errors).toContain("RAM failures");
      expect(result.Data.errors).toContain("Create table failures");
    });
  });

  describe("Skip Execution", () => {
    const mockCloudFormationClient = {
      send: jest.fn(),
    };

    (CloudFormationClient as jest.Mock).mockImplementation(() => mockCloudFormationClient);

    it("should skip execution when no config changes and previous errors were None", async () => {
      mockCloudFormationClient.send.mockResolvedValue({
        Stacks: [{ Outputs: [{ OutputKey: "construct-idErrors", OutputValue: "None" }] }],
      });

      const result = await onCreateUpdate(updateEvent(mockProps, mockProps));

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
      expect(mockCloudFormationClient.send).toHaveBeenCalledWith(expect.any(DescribeStacksCommand));
    });

    it("should proceed when CloudFormation call fails", async () => {
      mockCloudFormationClient.send.mockRejectedValue(new Error("AccessDenied"));
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const event = updateEvent(mockProps, mockProps);
      const result = await onCreateUpdate(event);

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should proceed when config has changed", async () => {
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const oldProps = { ...mockProps, datasetIds: ["different-dataset"] };
      const result = await onCreateUpdate(updateEvent(mockProps, oldProps));

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
      expect(mockCloudFormationClient.send).not.toHaveBeenCalled();
    });

    it("should proceed when previous errors exist", async () => {
      mockCloudFormationClient.send.mockResolvedValue({
        Stacks: [{ Outputs: [{ OutputKey: "construct-idErrors", OutputValue: "Some error occurred" }] }],
      });
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const result = await onCreateUpdate(updateEvent(mockProps, mockProps));

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should proceed when stack has no outputs", async () => {
      mockCloudFormationClient.send.mockResolvedValue({ Stacks: [{}] });
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const event = updateEvent(mockProps, mockProps);
      const result = await onCreateUpdate(event);

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should proceed when stack result has no stacks", async () => {
      mockCloudFormationClient.send.mockResolvedValue({});
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const event = updateEvent(mockProps, mockProps);
      const result = await onCreateUpdate(event);

      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });
  });

  describe("Update", () => {
    it("should collect disassociation errors", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["test-instance-id", ["dataset1", "dataset2"]]]));
      jest.spyOn(connectOperations, "batchDisassociateAnalyticsDatasets").mockResolvedValue({
        Success: ["dataset1"],
        Errors: [{ resourceId: "dataset2", error: "Disassociation failed" }],
      });
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue(["dataset1_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set());
      jest.spyOn(connectOperations, "listAnalyticsDataLakeDataSets").mockResolvedValue(new Set(["dataset1"]));
      jest
        .spyOn(glueOperations, "deleteResourceLinkTables")
        .mockResolvedValue({ Success: ["dataset1_123456789012"], Errors: [] });
      mockSuccess();

      const resultPromise = onCreateUpdate(
        updateEvent(mockProps, { ...mockProps, datasetIds: ["dataset1", "dataset2", "contact_statistic_record"] }),
      );
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      expect(result.Data.errors).toContain("Dataset disassociation failures: dataset2 - Disassociation failed");
    });

    it("should handle missing OldResourceProperties", async () => {
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const event = { RequestType: "Update", ResourceProperties: mockProps };
      const result = await onCreateUpdate(event as any);
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should cleanup and recreate on instance change", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["old-instance-id", ["dataset1", "dataset2"]]]));
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset1", "dataset2"], Errors: [] });
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue(["dataset1_123456789012", "dataset2_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set());
      jest
        .spyOn(connectOperations, "listAnalyticsDataLakeDataSets")
        .mockResolvedValue(new Set(["dataset1", "dataset2"]));
      jest
        .spyOn(glueOperations, "deleteResourceLinkTables")
        .mockResolvedValue({ Success: ["dataset1_123456789012", "dataset2_123456789012"], Errors: [] });
      mockSuccess();

      const resultPromise = onCreateUpdate(updateEvent(mockProps, mockOldProps));
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should handle update with no existing associations", async () => {
      jest.spyOn(connectOperations, "listAllAnalyticsDataAssociations").mockResolvedValue(new Map());
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue([]);
      mockSuccess();

      const result = await onCreateUpdate(updateEvent(mockProps, mockOldProps));
      expect(connectOperations.batchDisassociateAnalyticsDatasets).toHaveBeenCalledTimes(0);
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should skip table deletion for non-valid tables", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["test-instance-id", ["dataset1"]]]));
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset1"], Errors: [] });
      jest
        .spyOn(glueOperations, "getTableNames")
        .mockResolvedValue(["dataset1_123456789012", "other_dataset_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set());
      jest.spyOn(connectOperations, "listAnalyticsDataLakeDataSets").mockResolvedValue(new Set(["dataset1"]));
      jest.spyOn(glueOperations, "deleteResourceLinkTables").mockResolvedValue({
        Success: ["dataset1_123456789012"],
        Errors: [],
      });
      mockSuccess();

      const resultPromise = onCreateUpdate(
        updateEvent(mockProps, { ...mockProps, datasetIds: ["dataset1", "contact_statistic_record"] }),
      );
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(glueOperations.deleteResourceLinkTables).toHaveBeenCalledWith(
        mockClients.glue,
        new Set(["dataset1_123456789012"]),
      );
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should skip table deletion when there are no tables to delete", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["other-instance", ["dataset1"]]]));
      jest
        .spyOn(glueOperations, "getTableNames")
        .mockResolvedValue(["dataset1_123456789012", "other_dataset_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set(["dataset1_123456789012"]));
      jest.spyOn(connectOperations, "listAnalyticsDataLakeDataSets").mockResolvedValue(new Set(["dataset1"]));
      mockSuccess();

      const result = await onCreateUpdate(
        updateEvent(mockProps, { ...mockProps, datasetIds: ["dataset1", "contact_statistic_record"] }),
      );

      expect(glueOperations.deleteResourceLinkTables).toHaveBeenCalledTimes(0);
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should collect update errors", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["test-instance-id", ["dataset1", "dataset2"]]]));
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset2"], Errors: [] });
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue(["dataset2_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set());
      jest.spyOn(connectOperations, "listAnalyticsDataLakeDataSets").mockResolvedValue(new Set(["dataset2"]));
      jest.spyOn(glueOperations, "deleteResourceLinkTables").mockResolvedValue({
        Success: [],
        Errors: [{ resourceId: "dataset2_123456789012", error: "Delete failed" }],
      });
      mockSuccess();

      const resultPromise = onCreateUpdate(
        updateEvent(mockProps, { ...mockProps, datasetIds: ["dataset1", "contact_statistic_record", "dataset2"] }),
      );
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toContain("Delete table failures");
    });

    it("should handle dataset IDs change during update", async () => {
      jest
        .spyOn(connectOperations, "listAllAnalyticsDataAssociations")
        .mockResolvedValue(new Map([["test-instance-id", ["dataset1", "dataset2"]]]));
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset2"], Errors: [] });
      jest.spyOn(glueOperations, "getTableNames").mockResolvedValue(["dataset2_123456789012"]);
      jest.spyOn(ramOperations, "listRamSharedTables").mockResolvedValue(new Set());
      jest.spyOn(connectOperations, "listAnalyticsDataLakeDataSets").mockResolvedValue(new Set(["dataset2"]));
      jest
        .spyOn(glueOperations, "deleteResourceLinkTables")
        .mockResolvedValue({ Success: ["dataset2_123456789012"], Errors: [] });
      mockSuccess();

      const oldProps = { ...mockProps, datasetIds: ["dataset1", "dataset2"] };
      const newProps = { ...mockProps, datasetIds: ["dataset1", "dataset3"] };

      const resultPromise = onCreateUpdate(updateEvent(newProps, oldProps));
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(connectOperations.listAllAnalyticsDataAssociations).toHaveBeenCalledWith(
        mockClients.connect,
        "987654321098",
      );
      expect(connectOperations.batchDisassociateAnalyticsDatasets).toHaveBeenCalledWith(
        "test-instance-id",
        ["dataset2"],
        "987654321098",
        mockClients.connect,
      );

      jest
        .spyOn(glueOperations, "deleteResourceLinkTables")
        .mockResolvedValue({ Success: ["dataset2_123456789012"], Errors: [] });

      expect(connectOperations.batchAssociateAnalyticsDatasets).toHaveBeenCalledWith(
        "test-instance-id",
        ["dataset1", "dataset3"],
        "987654321098",
        mockClients.connect,
      );
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });
  });

  describe("Expired RAM Invite Errors", () => {
    it("should retry expired RAM invitations", async () => {
      jest
        .spyOn(connectOperations, "batchAssociateAnalyticsDatasets")
        .mockResolvedValueOnce({
          Created: [
            { DataSetId: "dataset1", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1" },
          ],
          Errors: [],
        })
        .mockResolvedValueOnce({
          Created: [
            { DataSetId: "dataset1", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share-new" },
          ],
          Errors: [],
        });
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest
        .spyOn(ramOperations, "acceptRamInvitations")
        .mockResolvedValueOnce({
          acceptedInvitations: new Map(),
          expiredInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["dataset1"]]]),
          errors: [],
        })
        .mockResolvedValueOnce({
          acceptedInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share-new", ["dataset1"]]]),
          errors: [],
        });
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset1"], Errors: [] });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({ Success: ["dataset1"], Errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toBe("None");
    });

    it("should handle expired invitation retry failures", async () => {
      jest.spyOn(connectOperations, "batchAssociateAnalyticsDatasets").mockResolvedValue({
        Created: [
          { DataSetId: "dataset1", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1" },
          { DataSetId: "dataset2", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share2" },
        ],
        Errors: [],
      });
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest.spyOn(ramOperations, "acceptRamInvitations").mockResolvedValue({
        acceptedInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share2", ["dataset2"]]]),
        expiredInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["dataset1"]]]),
        errors: [],
      });
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: [], Errors: [{ resourceId: "dataset1", error: "Failed to disassociate" }] });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({ Success: ["dataset2"], Errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toContain("dataset1 - Failed to disassociate");
    });

    it("should handle expired invitations with failed re-association", async () => {
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest
        .spyOn(connectOperations, "batchAssociateAnalyticsDatasets")
        .mockResolvedValueOnce({
          Created: [
            { DataSetId: "dataset1", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1" },
            { DataSetId: "dataset2", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share2" },
          ],
          Errors: [],
        })
        .mockResolvedValueOnce({ Created: [], Errors: [] });
      jest.spyOn(ramOperations, "acceptRamInvitations").mockResolvedValueOnce({
        acceptedInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share2", ["dataset2"]]]),
        expiredInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["dataset1"]]]),
        errors: [],
      });
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset1"], Errors: [] });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({ Success: ["dataset2"], Errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Status).toBe("SUCCESS");
      expect(result.Data.errors).toContain("Failed to re-associate expired datasets: dataset1");
    });

    it("should handle association errors during retry", async () => {
      jest.spyOn(lakeFormationOperations, "setupLakeFormationPermissions").mockResolvedValue(undefined);
      jest.spyOn(glueOperations, "createGlueDatabase").mockResolvedValue(undefined);
      jest
        .spyOn(connectOperations, "batchAssociateAnalyticsDatasets")
        .mockResolvedValueOnce({
          Created: [
            { DataSetId: "dataset1", ResourceShareArn: "arn:aws:ram:us-east-1:123456789012:resource-share/share1" },
          ],
          Errors: [],
        })
        .mockResolvedValueOnce({ Created: [], Errors: [{ resourceId: "dataset1", error: "Retry failed" }] });
      jest
        .spyOn(ramOperations, "acceptRamInvitations")
        .mockResolvedValueOnce({
          acceptedInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share2", ["dataset2"]]]),
          expiredInvitations: new Map([["arn:aws:ram:us-east-1:123456789012:resource-share/share1", ["dataset1"]]]),
          errors: [],
        })
        .mockResolvedValueOnce({ acceptedInvitations: new Map(), errors: [] });
      jest
        .spyOn(connectOperations, "batchDisassociateAnalyticsDatasets")
        .mockResolvedValue({ Success: ["dataset1"], Errors: [] });
      jest.spyOn(glueOperations, "createResourceLinkTables").mockResolvedValue({ Success: ["dataset2"], Errors: [] });

      const result = await onCreateUpdate(createEvent(mockProps));
      expect(result.Data.errors).toContain("Retry association failures");
    });
  });
});
