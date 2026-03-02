// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CdkCustomResourceEvent } from "aws-lambda";
import { RAM_STABILIZATION_MS } from "../config/constants";
import {
  batchDisassociateAnalyticsDatasets,
  listAllAnalyticsDataAssociations,
  listAnalyticsDataLakeDataSets,
} from "../services/connect-operations";
import { deleteGlueDatabase, deleteResourceLinkTables, getTableNames } from "../services/glue-operations";
import { removeLakeFormationPermissions } from "../services/lakeformation-operations";
import { listRamSharedTables } from "../services/ram-operations";
import { CustomResourceProperties } from "../types/custom-resource-properties";
import { CustomResourceResponse } from "../types/custom-resource-response";
import { ExecutionResult } from "../types/execution-result";
import { AwsClients, createAwsClients } from "../utils/aws-clients";

/**
 * Deletes Glue resource link tables for Connect datasets
 * @param instanceId - Connect instance ID
 * @param excludedDatasets - Set of dataset IDs to exclude from deletion
 * @param clients - AWS clients
 * @returns ExecutionResult
 */
async function deleteConstructManagedTables(instanceId: string, clients: AwsClients): Promise<ExecutionResult> {
  const allTableNames = await getTableNames(clients.glue);
  if (allTableNames.length === 0) {
    console.info("No tables found in Glue database");
    return { Success: [], Errors: [] };
  }

  const sharedTableNames = await listRamSharedTables(clients.ram);
  const validConnectDatasets = await listAnalyticsDataLakeDataSets(instanceId, clients.connect);

  // Calculate tables to delete: all tables - shared tables - non-Connect datasets
  const targetTables = new Set(
    allTableNames.filter((tableName) => {
      const datasetId = tableName.match(/^(.+)_\d{12}$/)?.[1];
      return datasetId && !sharedTableNames.has(tableName) && validConnectDatasets.has(datasetId);
    }),
  );
  if (targetTables.size === 0) {
    console.info("No tables to delete from Glue database");
    return { Success: [], Errors: [] };
  }

  return deleteResourceLinkTables(clients.glue, targetTables);
}

/**
 * Handles DELETE operations for Connect Data Lake integration cleanup
 *
 * @param event -  CloudFormation custom resource DELETE event
 * @returns CustomResourceResponse
 */
export async function onDelete(
  event: CdkCustomResourceEvent<CustomResourceProperties>,
): Promise<CustomResourceResponse> {
  const { instanceId, roleArn, lambdaAccountId, targetAccountId } = event.ResourceProperties;

  try {
    const clients = await createAwsClients(lambdaAccountId, targetAccountId, roleArn);

    const activeDatasetAssociations = await listAllAnalyticsDataAssociations(clients.connect, targetAccountId);
    const datasetsToDisassociate = activeDatasetAssociations.get(instanceId) || [];

    if (datasetsToDisassociate.length > 0) {
      const disassociateDatasetsResult = await batchDisassociateAnalyticsDatasets(
        instanceId,
        datasetsToDisassociate,
        targetAccountId,
        clients.connect,
      );

      if (disassociateDatasetsResult.Errors.length > 0) {
        throw new Error(
          `Failed to disassociate datasets: ${disassociateDatasetsResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, RAM_STABILIZATION_MS * 2));
    }

    const deleteTablesResult = await deleteConstructManagedTables(instanceId, clients);
    if (deleteTablesResult.Errors.length > 0) {
      throw new Error(
        `Failed to delete all resource link tables: ${deleteTablesResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
      );
    }

    await deleteGlueDatabase(clients.glue);

    await removeLakeFormationPermissions(roleArn, clients.lakeformation);

    return {
      Status: "SUCCESS",
      Data: {
        errors: "None",
      },
    };
  } catch (error) {
    console.error(error);
    throw new Error(`Critical error during delete operations. ${(error as Error).message}`);
  }
}
