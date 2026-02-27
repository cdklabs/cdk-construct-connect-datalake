// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Source database name in the Connect service account where analytics data resides
export const DATALAKE_DATABASE_NAME = "connect_datalake";

// Database containing resource links to Connect datasets
export const LAKE_FORMATION_DATABASE_NAME = "connect_datalake_database";

// Delay in milliseconds to allow for RAM eventual consistency
export const RAM_STABILIZATION_MS = 120000; // 2 minutes

// Expected errors that require special handling
export enum ExpectedErrors {
  ENTITY_NOT_FOUND = "EntityNotFoundException",
  ALREADY_EXISTS = "AlreadyExistsException",
  RESOURCE_SHARE_INVITATION_ALREADY_ACCEPTED = "ResourceShareInvitationAlreadyAcceptedException",
  RESOURCE_SHARE_INVITATION_EXPIRED = "ResourceShareInvitationExpiredException",
  UNKNOWN_RESOURCE = "UnknownResourceException",
}
