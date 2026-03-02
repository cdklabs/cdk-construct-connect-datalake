// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AnalyticsDataAssociationResult } from "@aws-sdk/client-connect";
import { acceptRamInvitations, listRamSharedTables } from "@src/handler/services/ram-operations";

jest.mock("@src/handler/config/constants", () => ({
  ExpectedErrors: {
    RESOURCE_SHARE_INVITATION_EXPIRED: "ResourceShareInvitationExpiredException",
    RESOURCE_SHARE_INVITATION_ALREADY_ACCEPTED: "ResourceShareInvitationAlreadyAcceptedException",
    UNKNOWN_RESOURCE: "UnknownResourceException",
  },
}));

jest.mock("@aws-sdk/client-ram", () => ({
  ...jest.requireActual("@aws-sdk/client-ram"),
  GetResourceShareInvitationsCommand: jest.fn().mockImplementation(() => ({})),
  AcceptResourceShareInvitationCommand: jest.fn().mockImplementation(() => ({})),
  GetResourceSharesCommand: jest.fn().mockImplementation(() => ({})),
  ListResourcesCommand: jest.fn().mockImplementation(() => ({})),
}));

const {
  GetResourceShareInvitationsCommand,
  AcceptResourceShareInvitationCommand,
  GetResourceSharesCommand,
  ListResourcesCommand,
} = jest.requireMock("@aws-sdk/client-ram");

const mockSend = jest.fn();
const mockRAMClient = {
  send: mockSend,
} as any;

interface MockError extends Error {
  name: string;
  code?: string;
}

describe("RAM Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("acceptRamInvitations", () => {
    it("should accept invitations successfully", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test2",
          DataSetId: "dataset2",
        },
      ];

      mockSend.mockResolvedValue({
        resourceShareInvitations: [
          {
            resourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
            resourceShareInvitationArn: "invitation1",
          },
          {
            resourceShareArn: "arn:aws:ram::123456789012:resource-share/test2",
            resourceShareInvitationArn: "invitation2",
          },
        ],
      });

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(2);
      expect(result.acceptedInvitations.get("arn:aws:ram::123456789012:resource-share/test1")).toEqual(["dataset1"]);
      expect(result.acceptedInvitations.get("arn:aws:ram::123456789012:resource-share/test2")).toEqual(["dataset2"]);
      expect(result.errors).toHaveLength(0);
      expect(GetResourceSharesCommand).toHaveBeenCalledTimes(2);
      expect(GetResourceShareInvitationsCommand).toHaveBeenCalledTimes(2);
      expect(AcceptResourceShareInvitationCommand).toHaveBeenCalledTimes(2);
    });

    it("should handle already accepted invitations", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
      ];

      const alreadyAcceptedError = new Error("Already accepted") as MockError;
      alreadyAcceptedError.name = "ResourceShareInvitationAlreadyAcceptedException";

      mockSend
        .mockResolvedValueOnce({
          resourceShareInvitations: [
            {
              resourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
              resourceShareInvitationArn: "invitation1",
            },
          ],
        })
        .mockRejectedValueOnce(alreadyAcceptedError);

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(1);
      expect(result.acceptedInvitations.get("arn:aws:ram::123456789012:resource-share/test1")).toEqual(["dataset1"]);
      expect(result.errors).toHaveLength(0);
      expect(GetResourceSharesCommand).toHaveBeenCalledWith({
        resourceOwner: "OTHER-ACCOUNTS",
        resourceShareArns: ["arn:aws:ram::123456789012:resource-share/test1"],
      });
      expect(GetResourceShareInvitationsCommand).toHaveBeenCalledTimes(1);
    });

    it("should handle expired invitations", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
      ];

      mockSend
        .mockResolvedValueOnce({
          resourceShares: [],
        })
        .mockResolvedValueOnce({
          resourceShareInvitations: [],
        });

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(0);
      expect(result.expiredInvitations?.size).toBe(1);
      expect(result.expiredInvitations?.get("arn:aws:ram::123456789012:resource-share/test1")).toEqual(["dataset1"]);
      expect(result.errors).toHaveLength(0);
      expect(GetResourceSharesCommand).toHaveBeenCalledWith({
        resourceOwner: "OTHER-ACCOUNTS",
        resourceShareArns: ["arn:aws:ram::123456789012:resource-share/test1"],
      });
      expect(GetResourceShareInvitationsCommand).toHaveBeenCalledWith({
        resourceShareArns: ["arn:aws:ram::123456789012:resource-share/test1"],
      });
    });

    it("should handle active resource shares", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
      ];

      mockSend.mockResolvedValueOnce({
        resourceShares: [
          {
            status: "ACTIVE",
          },
        ],
      });

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(1);
      expect(result.acceptedInvitations.get("arn:aws:ram::123456789012:resource-share/test1")).toEqual(["dataset1"]);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle missing ResourceShareArn or DataSetId", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: undefined,
        },
        {
          ResourceShareArn: undefined,
          DataSetId: "dataset2",
        },
      ];

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("undefined is missing ResourceShareArn or DataSetId");
      expect(result.errors[1]).toContain("dataset2 is missing ResourceShareArn or DataSetId");
      expect(GetResourceShareInvitationsCommand).not.toHaveBeenCalled();
    });

    it("should handle non-existent resources during active resources check", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
      ];

      const unknownResourceError = new Error("Unknown resource") as MockError;
      unknownResourceError.name = "UnknownResourceException";

      mockSend
        .mockRejectedValueOnce(unknownResourceError)
        .mockResolvedValueOnce({
          resourceShareInvitations: [
            {
              resourceShareInvitationArn: "invitation1",
            },
          ],
        })
        .mockResolvedValueOnce({});

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(GetResourceSharesCommand).toHaveBeenCalled();
      expect(GetResourceShareInvitationsCommand).toHaveBeenCalled();
    });

    it("should propagate unexpected errors from checkResourceShareStatus", async () => {
      const createdDatasets: AnalyticsDataAssociationResult[] = [
        {
          ResourceShareArn: "arn:aws:ram::123456789012:resource-share/test1",
          DataSetId: "dataset1",
        },
      ];

      const unexpectedError = new Error("Unexpected error") as MockError;
      unexpectedError.name = "ServiceException";

      mockSend.mockRejectedValueOnce(unexpectedError);

      const result = await acceptRamInvitations(createdDatasets, mockRAMClient);

      expect(result.acceptedInvitations.size).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Unexpected error");
      expect(GetResourceSharesCommand).toHaveBeenCalled();
      expect(GetResourceShareInvitationsCommand).toHaveBeenCalledTimes(0);
    });
  });

  describe("listRamSharedTables", () => {
    it("should return shared table names", async () => {
      mockSend.mockResolvedValue({
        resources: [
          { arn: "arn:aws:glue:us-east-1:111111111111:table/database/dataset1" },
          { arn: "arn:aws:glue:us-east-1:222222222222:table/database/dataset2" },
        ],
      });

      const result = await listRamSharedTables(mockRAMClient);

      expect(result).toEqual(new Set(["dataset1_111111111111", "dataset2_222222222222"]));
      expect(ListResourcesCommand).toHaveBeenCalledWith({
        resourceOwner: "OTHER-ACCOUNTS",
        resourceType: "glue:Table",
        nextToken: undefined,
      });
    });

    it("should handle pagination", async () => {
      mockSend
        .mockResolvedValueOnce({
          resources: [{ arn: "arn:aws:glue:us-east-1:111111111111:table/database/dataset1" }],
          nextToken: "token1",
        })
        .mockResolvedValueOnce({
          resources: [{ arn: "arn:aws:glue:us-east-1:222222222222:table/database/dataset2" }],
        });

      const result = await listRamSharedTables(mockRAMClient);

      expect(result).toEqual(new Set(["dataset1_111111111111", "dataset2_222222222222"]));
      expect(ListResourcesCommand).toHaveBeenCalledTimes(2);
    });

    it("should return empty set when no resources", async () => {
      mockSend.mockResolvedValue({ resources: [] });

      const result = await listRamSharedTables(mockRAMClient);

      expect(result).toEqual(new Set());
    });
  });
});
