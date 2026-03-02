// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { CdkCustomResourceEvent } from "aws-lambda";
import { RAM_STABILIZATION_MS } from "../config/constants";
import {
  batchAssociateAnalyticsDatasets,
  batchDisassociateAnalyticsDatasets,
  listAllAnalyticsDataAssociations,
  listAnalyticsDataLakeDataSets,
} from "../services/connect-operations";
import {
  createGlueDatabase,
  createResourceLinkTables,
  getTableNames,
  deleteResourceLinkTables,
} from "../services/glue-operations";
import { setupLakeFormationPermissions } from "../services/lakeformation-operations";
import { acceptRamInvitations, RamResult, listRamSharedTables } from "../services/ram-operations";
import { CustomResourceProperties } from "../types/custom-resource-properties";
import { CustomResourceResponse } from "../types/custom-resource-response";
import { createAwsClients, AwsClients } from "../utils/aws-clients";

/**
 * Disassociates datasets that are no longer in the custom resource event and removes the corresponding
 * tables during an UPDATE event
 *
 * Only deletes resource linked tables for valid Connect datasets that are no longer
 * associated with any instance.
 *
 * @param instanceId - Connect instance ID
 * @param currentDatasetIds - Array of dataset IDs to exclude from resource removal
 * @param targetAccountId - Target account ID where the datasets are associated
 * @param clients - AWS service clients
 * @returns Array of error messages encountered during resource removal
 */
async function removeOldResources(
  instanceId: string,
  currentDatasetIds: string[],
  targetAccountId: string,
  clients: AwsClients,
): Promise<string[]> {
  const errors: string[] = [];

  const activeDatasetAssociations = await listAllAnalyticsDataAssociations(clients.connect, targetAccountId);

  const currentInstanceDatasets = activeDatasetAssociations.get(instanceId) || [];
  const removedDatasets = currentInstanceDatasets.filter((dataset) => !currentDatasetIds.includes(dataset));

  if (removedDatasets.length > 0) {
    const disassociateDatasetsResult = await batchDisassociateAnalyticsDatasets(
      instanceId,
      removedDatasets,
      targetAccountId,
      clients.connect,
    );

    if (disassociateDatasetsResult.Errors.length > 0) {
      errors.push(
        `Dataset disassociation failures: ${disassociateDatasetsResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, RAM_STABILIZATION_MS));
  }

  const allTableNames = await getTableNames(clients.glue);
  if (allTableNames.length === 0) {
    console.info("No resource linked tables found in Glue database");
    return errors;
  }

  const sharedTableNames = await listRamSharedTables(clients.ram);
  const validConnectDatasets = await listAnalyticsDataLakeDataSets(instanceId, clients.connect);

  // Calculate tables to delete: all resource linked tables - shared tables - non-Connect datasets
  const targetTables = new Set(
    allTableNames.filter((tableName) => {
      const datasetId = tableName.match(/^(.+)_\d{12}$/)?.[1];
      return datasetId && !sharedTableNames.has(tableName) && validConnectDatasets.has(datasetId);
    }),
  );
  if (targetTables.size === 0) {
    console.info("No tables to delete from Glue database");
    return errors;
  }

  const deleteTablesResult = await deleteResourceLinkTables(clients.glue, targetTables);

  if (deleteTablesResult.Errors.length > 0) {
    errors.push(
      `Delete table failures: ${deleteTablesResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
    );
  }

  return errors;
}

/**
 * Handles expired RAM invitations by re-associating datasets
 *
 * When RAM invitations expire, this function disassociates and then re-associates
 * all datasets to generate new invitations. All dataset associations for an expired invite
 * will be included in datasetIds
 *
 * @param datasetIds - Array of dataset IDs with expired invitations
 * @param instanceId - Connect instance ID
 * @param targetAccountId - Target account ID for associations
 * @param clients - AWS service clients
 * @returns RamResult
 */
async function handleExpiredInvitations(
  datasetIds: string[],
  instanceId: string,
  targetAccountId: string,
  clients: AwsClients,
): Promise<RamResult> {
  const result: RamResult = { acceptedInvitations: new Map(), errors: [] };

  const disassociateDatasetsResult = await batchDisassociateAnalyticsDatasets(
    instanceId,
    datasetIds,
    targetAccountId,
    clients.connect,
  );

  if (disassociateDatasetsResult.Errors.length > 0) {
    result.errors.push(...disassociateDatasetsResult.Errors.map((e) => `${e.resourceId} - ${e.error}`));
    return result;
  }

  const associateDatasetsResult = await batchAssociateAnalyticsDatasets(
    instanceId,
    datasetIds,
    targetAccountId,
    clients.connect,
  );

  if (associateDatasetsResult.Errors.length > 0) {
    result.errors.push(
      `Retry association failures: ${associateDatasetsResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
    );
  }

  if (associateDatasetsResult.Created.length === 0) {
    result.errors.push(`Failed to re-associate expired datasets: ${datasetIds.join(", ")}`);
    return result;
  }

  const ramInviteResult = await acceptRamInvitations(associateDatasetsResult.Created, clients.ram);

  result.acceptedInvitations = ramInviteResult.acceptedInvitations;
  result.errors.push(...ramInviteResult.errors);
  return result;
}

/**
 * Creates the required resources for Data Lake integration
 *
 * In the instance owner account:
 * - Associates analytics datasets with target account
 *
 * In the target account:
 * - Sets up Lake Formation permissions
 * - Creates Glue database
 * - Accepts RAM resource share invitations
 * - Creates Glue resource link tables
 *
 * @param instanceId - Connect instance ID
 * @param datasetIds - Array of dataset IDs to associate
 * @param roleArn - IAM role ARN for Lake Formation permissions
 * @param targetAccountId - Target account ID for data lake resources
 * @param clients - AWS service clients
 * @returns Array of error messages encountered during creation
 */
async function createResources(
  instanceId: string,
  datasetIds: string[],
  roleArn: string,
  targetAccountId: string,
  clients: AwsClients,
): Promise<string[]> {
  const errors: string[] = [];

  const associateDatasetsResult = await batchAssociateAnalyticsDatasets(
    instanceId,
    datasetIds,
    targetAccountId,
    clients.connect,
  );

  if (associateDatasetsResult.Errors.length > 0) {
    errors.push(
      `Association failures: ${associateDatasetsResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
    );
  }
  if (associateDatasetsResult.Created.length === 0) {
    throw new Error("Failed to create any dataset associations");
  }

  await setupLakeFormationPermissions(roleArn, clients.lakeformation);

  await createGlueDatabase(clients.glue);

  const ramInviteResult = await acceptRamInvitations(associateDatasetsResult.Created, clients.ram);

  if (ramInviteResult.expiredInvitations?.size) {
    const expiredDatasets = Array.from(ramInviteResult.expiredInvitations.values()).flat();
    const expiredRamInviteResult = await handleExpiredInvitations(
      expiredDatasets,
      instanceId,
      targetAccountId,
      clients,
    );

    expiredRamInviteResult.acceptedInvitations.forEach((datasets, arn) => {
      ramInviteResult.acceptedInvitations.set(arn, datasets);
    });
    errors.push(...expiredRamInviteResult.errors);
  }

  if (ramInviteResult.errors.length > 0) {
    errors.push(`RAM failures recorded: ${ramInviteResult.errors.join("; ")}`);
  }

  if (ramInviteResult.acceptedInvitations.size === 0) {
    throw new Error("No RAM requests were accepted");
  }

  const acceptedDatasets = Array.from(ramInviteResult.acceptedInvitations.values()).flat();

  // Retrieve the shared catalog ID from the accepted resource share ARN
  const resourceShareArn = ramInviteResult.acceptedInvitations.keys().next().value!;
  const sharedCatalogId = resourceShareArn.split(":")[4];

  const createTablesResult = await createResourceLinkTables(acceptedDatasets, sharedCatalogId, clients.glue);

  if (createTablesResult.Errors.length > 0) {
    errors.push(
      `Create table failures: ${createTablesResult.Errors.map((e) => `${e.resourceId} - ${e.error}`).join("; ")}`,
    );
  }
  if (createTablesResult.Success.length === 0) {
    throw new Error("No successful resource link tables created");
  }

  return errors;
}

/**
 * Determines if the handler execution should be skipped for Update events.
 * Execution will be skipped if the previous deployment was successful (no errors) and props have not changed
 *
 * @param event - The CDK custom resource event
 * @returns true if execution should be skipped, false otherwise
 */
async function shouldSkipExecution(event: CdkCustomResourceEvent<CustomResourceProperties>): Promise<boolean> {
  if (event.RequestType !== "Update") {
    return false;
  }

  const { datasetIds, roleArn, instanceId, constructId } = event.ResourceProperties;
  const oldProps = event.OldResourceProperties || {};

  if (
    JSON.stringify(oldProps.datasetIds) !== JSON.stringify(datasetIds) ||
    oldProps.roleArn !== roleArn ||
    oldProps.instanceId !== instanceId
  ) {
    return false;
  }

  try {
    const cloudFormationClient = new CloudFormationClient({ region: process.env.AWS_REGION });
    const describeStackResponse = await cloudFormationClient.send(
      new DescribeStacksCommand({ StackName: event.StackId }),
    );
    const stackOutputs = describeStackResponse.Stacks?.[0]?.Outputs || [];
    const constructErrorOutput = stackOutputs.find((o) => o.OutputKey?.startsWith(`${constructId}Errors`));

    return constructErrorOutput?.OutputValue === "None";
  } catch (error) {
    console.error("Could not read previous errors, proceeding with execution: ", error);
    return false;
  }
}

/**
 * Handles CREATE and UPDATE operations for Connect Data Lake setup
 *
 * @param event - CloudFormation custom resource event
 * @returns CustomResourceResponse
 */
export async function onCreateUpdate(
  event: CdkCustomResourceEvent<CustomResourceProperties>,
): Promise<CustomResourceResponse> {
  const skipExecution = await shouldSkipExecution(event);
  if (skipExecution) {
    console.info(`Update not required, skipping execution`);
    return {
      Status: "SUCCESS",
      Data: { errors: "None" },
    };
  }

  const { instanceId, datasetIds, roleArn, lambdaAccountId, targetAccountId } = event.ResourceProperties;
  const errors: string[] = [];

  try {
    const clients = await createAwsClients(lambdaAccountId, targetAccountId, roleArn);

    // Handle resource cleanup during UPDATE event
    if (event.RequestType === "Update") {
      const { instanceId: oldInstanceId } = event.OldResourceProperties || {};

      if (oldInstanceId && instanceId !== oldInstanceId) {
        console.info(`Removing resources for old instance ID`);
        errors.push(...(await removeOldResources(oldInstanceId, [], targetAccountId, clients)));
      } else {
        console.info(`Removing resources for old dataset associations`);
        errors.push(...(await removeOldResources(instanceId, datasetIds, targetAccountId, clients)));
      }
    }

    // Continue with resource creation
    errors.push(...(await createResources(instanceId, datasetIds, roleArn, targetAccountId, clients)));

    return {
      Status: "SUCCESS",
      Data: {
        errors: errors.length > 0 ? errors.join("; ") : "None",
      },
    };
  } catch (error) {
    return {
      Status: "SUCCESS",
      Data: {
        errors: `Critical error during operations. ${(error as Error).message}`,
      },
    };
  }
}
