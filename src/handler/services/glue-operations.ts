// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GlueClient,
  CreateDatabaseCommand,
  DeleteDatabaseCommand,
  CreateTableCommand,
  DeleteTableCommand,
  GetTablesCommand,
  Table,
} from "@aws-sdk/client-glue";
import { DATALAKE_DATABASE_NAME, LAKE_FORMATION_DATABASE_NAME, ExpectedErrors } from "../config/constants";
import { ExecutionResult } from "../types/execution-result";

/**
 * Creates a database in the Glue Data Catalog
 *
 * @param glueClient - Glue client instance
 */
export async function createGlueDatabase(glueClient: GlueClient): Promise<void> {
  console.info(`Creating database ${LAKE_FORMATION_DATABASE_NAME}`);

  try {
    await glueClient.send(
      new CreateDatabaseCommand({
        DatabaseInput: {
          Name: LAKE_FORMATION_DATABASE_NAME,
          Description:
            "Database containing resource links to Connect datasets - created and managed by DataLakeAccess construct",
        },
      }),
    );
  } catch (error) {
    if ((error as Error).name === ExpectedErrors.ALREADY_EXISTS) {
      console.info(`Database ${LAKE_FORMATION_DATABASE_NAME} already exists`);
    } else {
      console.error(error);
      throw new Error(`Failed to create ${LAKE_FORMATION_DATABASE_NAME} database: ${(error as Error).message}`);
    }
  }
}

/**
 * Deletes a database from the Glue Data Catalog
 *
 * @param glueClient - Glue client instance
 */
export async function deleteGlueDatabase(glueClient: GlueClient): Promise<void> {
  console.info(`Deleting database ${LAKE_FORMATION_DATABASE_NAME}`);

  try {
    const allTables = await getAllTables(glueClient);

    if (allTables.length > 0) {
      console.info(`Database ${LAKE_FORMATION_DATABASE_NAME} contains tables. Skipping deletion.`);
      return;
    }

    await glueClient.send(new DeleteDatabaseCommand({ Name: LAKE_FORMATION_DATABASE_NAME }));
  } catch (error) {
    if ((error as Error).name === ExpectedErrors.ENTITY_NOT_FOUND) {
      console.info(`Database ${LAKE_FORMATION_DATABASE_NAME} does not exist. Continuing resource cleanup`);
    } else {
      console.error(error);
      throw new Error(`Failed to delete ${LAKE_FORMATION_DATABASE_NAME} database: ${(error as Error).message}`);
    }
  }
}

/**
 * Creates resource link tables for the given datasets
 *
 * @param datasetIds - Array of dataset IDs
 * @param sharedCatalogId - Catalog ID for the shared resource
 * @param glueClient - Glue client instance
 * @returns ExecutionResult
 */
export async function createResourceLinkTables(
  datasetIds: string[],
  sharedCatalogId: string,
  glueClient: GlueClient,
): Promise<ExecutionResult> {
  console.info(`Creating resource link tables for datasets  ${datasetIds.join(", ")}`);

  const results: ExecutionResult = { Success: [], Errors: [] };

  for (const datasetId of datasetIds) {
    try {
      const tableName = `${datasetId}_${sharedCatalogId}`;
      await glueClient.send(
        new CreateTableCommand({
          DatabaseName: LAKE_FORMATION_DATABASE_NAME,
          TableInput: {
            Name: tableName,
            TargetTable: {
              CatalogId: sharedCatalogId,
              DatabaseName: DATALAKE_DATABASE_NAME,
              Name: datasetId,
            },
          },
        }),
      );
      results.Success.push(datasetId);
    } catch (error) {
      if ((error as Error).name === ExpectedErrors.ALREADY_EXISTS) {
        console.info(`Resource link table for dataset ${datasetId} already exists`);
        results.Success.push(datasetId);
      } else {
        console.error(error);
        results.Errors.push({
          resourceId: datasetId,
          error: (error as Error).message,
        });
      }
    }
  }
  return results;
}

/**
 * Retrieves all tables from the common database
 *
 * @param glueClient - Glue client instance
 * @returns Array of Table objects
 */
async function getAllTables(glueClient: GlueClient): Promise<Table[]> {
  const allTables: Table[] = [];
  let nextToken: string | undefined;

  do {
    const response = await glueClient.send(
      new GetTablesCommand({
        DatabaseName: LAKE_FORMATION_DATABASE_NAME,
        NextToken: nextToken,
      }),
    );
    if (response.TableList) {
      allTables.push(...response.TableList);
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return allTables;
}

/**
 * Retrieves resource link table names that point to DATALAKE_DATABASE_NAME
 *
 * @param glueClient - Glue client instance
 * @returns Array of resource link table names
 */
export async function getTableNames(glueClient: GlueClient): Promise<string[]> {
  try {
    const allTables = await getAllTables(glueClient);
    return allTables
      .filter((table) => table.TargetTable?.DatabaseName === DATALAKE_DATABASE_NAME)
      .map((table) => {
        if (!table.Name) throw new Error("Table is missing Name property");
        return table.Name;
      });
  } catch (error) {
    if ((error as Error).name === ExpectedErrors.ENTITY_NOT_FOUND) {
      console.info(`Database ${LAKE_FORMATION_DATABASE_NAME} does not exist`);
      return [];
    }
    throw new Error(`Failed to get resource link table names: ${(error as Error).message}`);
  }
}

/**
 * Deletes a given set of resource link tables in the database
 *
 * @param glueClient - Glue client instance
 * @param targetTables - Set of dataset IDs to delete
 * @returns ExecutionResult
 */
export async function deleteResourceLinkTables(
  glueClient: GlueClient,
  targetTables: Set<string>,
): Promise<ExecutionResult> {
  console.info(`Deleting resource link table(s): ${Array.from(targetTables).join(", ")}`);

  const results: ExecutionResult = { Success: [], Errors: [] };

  for (const tableName of targetTables) {
    try {
      await glueClient.send(
        new DeleteTableCommand({
          DatabaseName: LAKE_FORMATION_DATABASE_NAME,
          Name: tableName,
        }),
      );
      results.Success.push(tableName);
    } catch (error) {
      if ((error as Error).name === ExpectedErrors.ENTITY_NOT_FOUND) {
        console.info(`Table ${tableName} does not exist. Counting as deleted.`);
        results.Success.push(tableName);
      } else {
        console.error(error);
        results.Errors.push({
          resourceId: tableName,
          error: (error as Error).message,
        });
      }
    }
  }
  return results;
}
