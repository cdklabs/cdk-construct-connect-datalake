// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AnalyticsDataAssociationResult } from "@aws-sdk/client-connect";
import {
  GetResourceShareInvitationsCommand,
  AcceptResourceShareInvitationCommand,
  RAMClient,
  GetResourceSharesCommand,
  ListResourcesCommand,
} from "@aws-sdk/client-ram";
import { ExpectedErrors } from "../config/constants";

/**
 * Result of RAM invitation acceptance operations
 */
export interface RamResult {
  /**
   * Map of accepted resource share ARNs to their associated dataset IDs
   */
  acceptedInvitations: Map<string, string[]>;

  /**
   * Optional map of expired resource share ARNs to their associated dataset IDs
   */
  expiredInvitations?: Map<string, string[]>;

  /**
   * Error message describing the failure
   */
  errors: string[];
}

/**
 * Accepts a single RAM resource share invitation
 *
 * @param resourceShareArn - ARN of the resource share to accept
 * @param ramClient - RAM client instance
 */
async function acceptRamInvitation(resourceShareArn: string, ramClient: RAMClient): Promise<void> {
  const resourceShareInvitationsResponse = await ramClient.send(
    new GetResourceShareInvitationsCommand({
      resourceShareArns: [resourceShareArn],
    }),
  );
  const invitation = resourceShareInvitationsResponse.resourceShareInvitations?.[0];

  if (!invitation?.resourceShareInvitationArn) {
    const error = new Error(`No active resource share found. Resource share has likely expired.`);
    error.name = ExpectedErrors.RESOURCE_SHARE_INVITATION_EXPIRED;
    throw error;
  }

  await ramClient.send(
    new AcceptResourceShareInvitationCommand({
      resourceShareInvitationArn: invitation.resourceShareInvitationArn,
    }),
  );
}

/**
 * Checks if resource share is active
 *
 * @param resourceShareArn - ARN of the resource share to check
 * @param ramClient - RAM client instance
 */
async function checkResourceShareStatus(resourceShareArn: string, ramClient: RAMClient): Promise<boolean> {
  try {
    const resourceShareResponse = await ramClient.send(
      new GetResourceSharesCommand({
        resourceOwner: "OTHER-ACCOUNTS",
        resourceShareArns: [resourceShareArn],
      }),
    );
    const resourceShare = resourceShareResponse.resourceShares?.[0];
    if (resourceShare?.status === "ACTIVE") {
      return true;
    }

    return false;
  } catch (error) {
    if ((error as Error).name === ExpectedErrors.UNKNOWN_RESOURCE) {
      return false;
    }

    throw error;
  }
}

/**
 * Accepts RAM invitations for dataset associations
 *
 * Groups datasets by resource share ARN and attempts to accept each invitation.
 * Handles expired invitations separately
 *
 * @param createdDatasets - Array of dataset association results from Connect
 * @param ramClient - RAM client instance
 * @returns RamResult
 */
export async function acceptRamInvitations(
  createdDatasets: AnalyticsDataAssociationResult[],
  ramClient: RAMClient,
): Promise<RamResult> {
  const result: RamResult = { acceptedInvitations: new Map(), errors: [] };
  const pendingInvitations = new Map<string, string[]>();

  createdDatasets.forEach((dataset) => {
    if (dataset.ResourceShareArn && dataset.DataSetId) {
      if (!pendingInvitations.has(dataset.ResourceShareArn)) {
        pendingInvitations.set(dataset.ResourceShareArn, []);
      }
      pendingInvitations.get(dataset.ResourceShareArn)!.push(dataset.DataSetId);
    } else {
      result.errors.push(`${dataset.DataSetId || "undefined"} is missing ResourceShareArn or DataSetId`);
    }
  });

  for (const [arn, datasets] of pendingInvitations.entries()) {
    try {
      const isResourceShareActive = await checkResourceShareStatus(arn, ramClient);
      if (!isResourceShareActive) {
        await acceptRamInvitation(arn, ramClient);
      }
      result.acceptedInvitations.set(arn, datasets);
    } catch (error) {
      if ((error as Error).name === ExpectedErrors.RESOURCE_SHARE_INVITATION_EXPIRED) {
        console.error(error);
        if (!result.expiredInvitations) {
          result.expiredInvitations = new Map();
        }
        result.expiredInvitations.set(arn, datasets);
      } else if ((error as Error).name === ExpectedErrors.RESOURCE_SHARE_INVITATION_ALREADY_ACCEPTED) {
        console.error(error);
        result.acceptedInvitations.set(arn, datasets);
      } else {
        console.error(error);
        result.errors.push(
          `Failed to accept RAM invitation for datasets [${datasets.join(", ")}]: ${(error as Error).message}`,
        );
      }
    }
  }

  return result;
}

/**
 * Lists all RAM resource-shared Glue table names
 *
 * @param ramClient - RAM client instance
 * @returns Set of table names in format datasetId_dataCatalogId
 */
export async function listRamSharedTables(ramClient: RAMClient): Promise<Set<string>> {
  const tableNames = new Set<string>();
  let nextToken: string | undefined;

  do {
    const response = await ramClient.send(
      new ListResourcesCommand({
        resourceOwner: "OTHER-ACCOUNTS",
        resourceType: "glue:Table",
        nextToken,
      }),
    );
    if (response.resources) {
      response.resources.forEach((resource) => {
        if (resource.arn) {
          const tableName = resource.arn.split("/").pop();
          const dataCatalogId = resource.arn.split(":")[4];
          if (tableName && dataCatalogId) {
            tableNames.add(`${tableName}_${dataCatalogId}`);
          }
        }
      });
    }
    nextToken = response.nextToken;
  } while (nextToken);

  return tableNames;
}
