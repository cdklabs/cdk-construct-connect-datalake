// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  AnalyticsDataAssociationResult,
  AssociateAnalyticsDataSetCommand,
  BatchAssociateAnalyticsDataSetCommand,
  BatchAssociateAnalyticsDataSetCommandOutput,
  BatchDisassociateAnalyticsDataSetCommand,
  BatchDisassociateAnalyticsDataSetCommandOutput,
  ConnectClient,
  DisassociateAnalyticsDataSetCommand,
  ListAnalyticsDataAssociationsCommand,
  ListAnalyticsDataAssociationsCommandOutput,
  ListInstancesCommand,
  ListAnalyticsDataLakeDataSetsCommand,
  ListAnalyticsDataLakeDataSetsCommandOutput,
} from "@aws-sdk/client-connect";
import { ExecutionResult } from "../types/execution-result";

/**
 * Result of dataset association operations
 */
export interface AssociationResult {
  /**
   * Array of successfully created dataset associations
   */
  Created: AnalyticsDataAssociationResult[];

  /**
   * Array of errors encountered during association
   */
  Errors: Array<{
    /**
     * Identifier of the resource that failed
     */
    resourceId: string;
    /**
     * Error message describing the failure
     */
    error: string;
  }>;
}

/**
 * Individually associates analytics datasets for a Connect instance with the target account
 *
 * Called when batch association partially fails. Attempts each failed dataset ID one by one
 *
 * @param instanceId - Connect instance ID
 * @param datasetIds -  Array of dataset IDs to associate
 * @param connectClient - Connect client instance
 * @param targetAccountId - Target account ID for association
 * @returns AssociationResult
 */
async function associateAnalyticsDataSets(
  instanceId: string,
  datasetIds: string[],
  connectClient: ConnectClient,
  targetAccountId: string,
): Promise<AssociationResult> {
  const results: AssociationResult = { Created: [], Errors: [] };

  for (const datasetId of datasetIds) {
    try {
      const associateResponse: AnalyticsDataAssociationResult = await connectClient.send(
        new AssociateAnalyticsDataSetCommand({
          InstanceId: instanceId,
          DataSetId: datasetId,
          TargetAccountId: targetAccountId,
        }),
      );
      results.Created.push(associateResponse);
    } catch (error) {
      console.error(`Failed to associate dataset ${datasetId}:`, error);
      results.Errors.push({
        resourceId: datasetId,
        error: (error as Error).message,
      });
    }
  }
  return results;
}

/**
 * Associates analytics datasets for a Connect instance with the target account
 *
 * @param instanceId - Connect instance ID
 * @param datasetIds - Array of dataset IDs to associate
 * @param targetAccountId - Target account ID for the associations
 * @param connectClient - Connect client instance
 * @returns AssociationResult
 */
export async function batchAssociateAnalyticsDatasets(
  instanceId: string,
  datasetIds: string[],
  targetAccountId: string,
  connectClient: ConnectClient,
): Promise<AssociationResult> {
  console.info(
    `Associating datasets for instance ${instanceId} and target account ${targetAccountId}. Datasets: ${datasetIds.join(", ")}`,
  );

  const results: AssociationResult = { Created: [], Errors: [] };

  try {
    const batchAssociateResponse: BatchAssociateAnalyticsDataSetCommandOutput = await connectClient.send(
      new BatchAssociateAnalyticsDataSetCommand({
        InstanceId: instanceId,
        DataSetIds: datasetIds,
        TargetAccountId: targetAccountId,
      }),
    );
    if (batchAssociateResponse.Created) {
      results.Created.push(...batchAssociateResponse.Created);
    }
  } catch (error) {
    console.error(`Batch associate failed:`, error);
  }

  // Retry failed dataset associations individually
  const successfulAssociations = new Set(results.Created.map((dataset) => dataset.DataSetId));
  const failedDatasetIds = datasetIds.filter((id) => !successfulAssociations.has(id));
  if (failedDatasetIds.length != 0) {
    const retryResults = await associateAnalyticsDataSets(instanceId, failedDatasetIds, connectClient, targetAccountId);
    results.Created.push(...retryResults.Created);
    results.Errors.push(...retryResults.Errors);
  }

  return results;
}

/**
 * Individually disassociates analytics datasets that are associated with a Connect instance
 *
 * Called when batch disassociation partially fails. Attempts each failed dataset ID one by one
 *
 * @param instanceId - Connect instance ID
 * @param datasetIds -  Array of dataset IDs to disassociate
 * @param connectClient - Connect client instance
 * @param targetAccountId - Target account ID for disassociation
 * @returns ExecutionResult
 */
async function disassociateAnalyticsDatasets(
  instanceId: string,
  datasetIds: string[],
  connectClient: ConnectClient,
  targetAccountId: string,
): Promise<ExecutionResult> {
  const results: ExecutionResult = { Success: [], Errors: [] };

  for (const datasetId of datasetIds) {
    try {
      await connectClient.send(
        new DisassociateAnalyticsDataSetCommand({
          InstanceId: instanceId,
          DataSetId: datasetId,
          TargetAccountId: targetAccountId,
        }),
      );
      results.Success.push(datasetId);
    } catch (error) {
      console.error(`Failed to disassociate dataset ${datasetId}:`, error);
      results.Errors.push({
        resourceId: datasetId,
        error: (error as Error).message,
      });
    }
  }
  return results;
}

/**
 * Disassociates analytics datasets that are associated with a Connect instance
 *
 * @param instanceId - Connect instance ID
 * @param datasetIds - Array of dataset IDs to disassociate
 * @param targetAccountId - Target account ID where datasets are associated
 * @param connectClient - Connect client instance
 * @returns ExecutionResult
 */
export async function batchDisassociateAnalyticsDatasets(
  instanceId: string,
  datasetIds: string[],
  targetAccountId: string,
  connectClient: ConnectClient,
): Promise<ExecutionResult> {
  console.info(
    `Disassociating datasets for instance ${instanceId} and target account ${targetAccountId}. Datasets: ${datasetIds.join(", ")}`,
  );

  const results: ExecutionResult = { Success: [], Errors: [] };

  try {
    const batchDisassociateResponse: BatchDisassociateAnalyticsDataSetCommandOutput = await connectClient.send(
      new BatchDisassociateAnalyticsDataSetCommand({
        InstanceId: instanceId,
        DataSetIds: datasetIds,
        TargetAccountId: targetAccountId,
      }),
    );

    if (batchDisassociateResponse.Deleted) {
      results.Success.push(...batchDisassociateResponse.Deleted);
    }
  } catch (error) {
    console.error(`Batch disassociate failed:`, error);
  }

  // Retry failed dataset disassociations individually
  const successfulDisassociations = new Set(results.Success);
  const failedDatasetIds = datasetIds.filter((id) => !successfulDisassociations.has(id));
  if (failedDatasetIds.length != 0) {
    const retryResults = await disassociateAnalyticsDatasets(
      instanceId,
      failedDatasetIds,
      connectClient,
      targetAccountId,
    );
    results.Success.push(...retryResults.Success);
    results.Errors.push(...retryResults.Errors);
  }

  return results;
}

/**
 * Lists all available analytics data lake datasets for a Connect instance
 *
 * @param instanceId - Connect instance ID
 * @param connectClient - Connect client instance
 * @returns Set of valid connect analytics dataset IDs
 */
export async function listAnalyticsDataLakeDataSets(
  instanceId: string,
  connectClient: ConnectClient,
): Promise<Set<string>> {
  console.info(`Listing all available analytics data lake datasets for instance ${instanceId}`);

  const datasetIds = new Set<string>();
  let nextToken: string | undefined;

  do {
    const response: ListAnalyticsDataLakeDataSetsCommandOutput = await connectClient.send(
      new ListAnalyticsDataLakeDataSetsCommand({
        InstanceId: instanceId,
        NextToken: nextToken,
      }),
    );

    if (response.Results) {
      response.Results.forEach((dataset) => {
        if (dataset.DataSetId) {
          datasetIds.add(dataset.DataSetId);
        }
      });
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return datasetIds;
}

/**
 * Lists all current analytics data associations for a Connect instance
 *
 * @param instanceId - Connect instance ID
 * @param connectClient - Connect client instance
 * @returns Array of AnalyticsDataAssociationResult
 */
async function listAnalyticsDataAssociations(
  instanceId: string,
  connectClient: ConnectClient,
): Promise<AnalyticsDataAssociationResult[]> {
  console.info(`Listing all associations for instance ${instanceId}`);

  const listAssociationsResult: AnalyticsDataAssociationResult[] = [];
  let nextToken: string | undefined;

  do {
    const listAnalyticsDataAssociationsResponse: ListAnalyticsDataAssociationsCommandOutput = await connectClient.send(
      new ListAnalyticsDataAssociationsCommand({
        InstanceId: instanceId,
        NextToken: nextToken,
      }),
    );

    if (listAnalyticsDataAssociationsResponse.Results) {
      listAssociationsResult.push(...listAnalyticsDataAssociationsResponse.Results);
    }

    nextToken = listAnalyticsDataAssociationsResponse.NextToken;
  } while (nextToken);

  return listAssociationsResult;
}

/**
 * Lists all dataset associations grouped by instance for a target account
 *
 * @param connectClient - Connect client instance
 * @param targetAccountId - Target account ID to filter associations
 * @returns Map of instance IDs to their associated dataset IDs
 */
export async function listAllAnalyticsDataAssociations(
  connectClient: ConnectClient,
  targetAccountId: string,
): Promise<Map<string, string[]>> {
  console.info(`Listing all associations across all instances for target account ${targetAccountId}`);

  try {
    const listInstancesResponse = await connectClient.send(new ListInstancesCommand({}));
    const targetAccountAssociations = new Map<string, string[]>();

    for (const instance of listInstancesResponse.InstanceSummaryList || []) {
      if (!instance.Id) {
        throw new Error(`InstanceID is missing for instance ${JSON.stringify(instance)}`);
      }

      const instanceAssociations = await listAnalyticsDataAssociations(instance.Id, connectClient);
      const datasetIds: string[] = [];

      instanceAssociations.forEach((association) => {
        if (!association.DataSetId || !association.TargetAccountId) {
          throw new Error(`DataSetId or TargetAccountId is missing for association ${JSON.stringify(association)}`);
        }
        if (association.TargetAccountId === targetAccountId) {
          datasetIds.push(association.DataSetId);
        }
      });

      targetAccountAssociations.set(instance.Id, datasetIds);
    }

    return targetAccountAssociations;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to list all associations. ${(error as Error).message}`);
  }
}
