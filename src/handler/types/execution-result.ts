// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Execution result tracking successful and failed processing operations
 * */
export type ExecutionResult = {
  /**
   * Array of successfully processed resource identifiers (e.g., dataset IDs, table names)
   */
  Success: string[];

  /**
   * Array of errors encountered during processing
   */
  Errors: Array<{
    /**
     * Identifier of the resource that failed (e.g., dataset ID, table name)
     */
    resourceId: string;

    /**
     * Error message describing the failure
     */
    error: string;
  }>;
};
