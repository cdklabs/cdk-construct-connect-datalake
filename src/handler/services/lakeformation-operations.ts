// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  GetDataLakeSettingsCommand,
  LakeFormationClient,
  PutDataLakeSettingsCommand,
  DataLakePrincipal,
  GetDataLakeSettingsCommandOutput,
} from "@aws-sdk/client-lakeformation";

/**
 * Retrieves current Lake Formation settings and admin principals
 *
 * @param lakeformationClient - Lake Formation client instance
 * @returns Current admins list and settings object
 */
async function getDataLakeSettings(lakeformationClient: LakeFormationClient): Promise<{
  admins: DataLakePrincipal[];
  settings: GetDataLakeSettingsCommandOutput;
}> {
  const settings = await lakeformationClient.send(new GetDataLakeSettingsCommand({}));
  const admins = settings.DataLakeSettings?.DataLakeAdmins || [];

  return { admins, settings };
}

/**
 * Updates Lake Formation admin principals while preserving other settings
 *
 * @param lakeformationClient - Lake Formation client instance
 * @param updatedAdmins - New list of admin principals to set
 * @param settings - Existing settings to preserve previous configurations
 */
async function updateDataLakeSettings(
  lakeformationClient: LakeFormationClient,
  updatedAdmins: DataLakePrincipal[],
  settings: GetDataLakeSettingsCommandOutput,
): Promise<void> {
  await lakeformationClient.send(
    new PutDataLakeSettingsCommand({
      DataLakeSettings: {
        ...settings.DataLakeSettings,
        DataLakeAdmins: updatedAdmins,
      },
    }),
  );
}

/**
 * Sets up Lake Formation admin permissions for the specified role
 *
 * @param roleArn - ARN of the role to grant permissions to
 * @param lakeformationClient - Lake Formation client instance
 */
export async function setupLakeFormationPermissions(
  roleArn: string,
  lakeformationClient: LakeFormationClient,
): Promise<void> {
  console.info(`Setting up Lake Formation permissions for role: ${roleArn}`);

  try {
    const { admins, settings } = await getDataLakeSettings(lakeformationClient);

    const hasRole = admins.some((admin) => admin.DataLakePrincipalIdentifier === roleArn);

    if (hasRole) {
      console.info(`Role ${roleArn} already has Lake Formation admin permissions`);
      return;
    }

    const updatedAdmins = [...admins, { DataLakePrincipalIdentifier: roleArn }];
    await updateDataLakeSettings(lakeformationClient, updatedAdmins, settings);
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to setup Lake Formation permissions: ${(error as Error).message}`);
  }
}

/**
 * Removes specified role from Lake Formation permissions
 *
 * @param roleArn - ARN of the role to remove permissions for
 * @param lakeformationClient - Lake Formation client instance
 */
export async function removeLakeFormationPermissions(
  roleArn: string,
  lakeformationClient: LakeFormationClient,
): Promise<void> {
  console.info(`Removing Lake Formation permissions for role: ${roleArn}`);

  try {
    const { admins, settings } = await getDataLakeSettings(lakeformationClient);

    const hasRole = admins.some((admin) => admin.DataLakePrincipalIdentifier === roleArn);

    if (!hasRole) {
      console.info(`Role ${roleArn} not found in Lake Formation admins`);
      return;
    }

    const updatedAdmins = admins.filter((admin) => admin.DataLakePrincipalIdentifier !== roleArn);
    await updateDataLakeSettings(lakeformationClient, updatedAdmins, settings);
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to cleanup Lake Formation permissions: ${(error as Error).message}`);
  }
}
