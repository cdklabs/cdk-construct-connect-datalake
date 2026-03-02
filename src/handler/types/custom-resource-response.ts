// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * CloudFormation response structure for custom resource operations
 */
export interface CustomResourceResponse {
  /** Status of the custom resource operation */
  Status: "SUCCESS" | "FAILED";

  /** Additional response data */
  Data: {
    /** Error message containing information for failed operations */
    errors: string;
  };
}
