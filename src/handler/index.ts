// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CdkCustomResourceEvent, CdkCustomResourceResponse, Context } from "aws-lambda";
import { onCreateUpdate } from "./on-event/on-create-update";
import { onDelete } from "./on-event/on-delete";
import { CustomResourceProperties } from "./types/custom-resource-properties";

/**
 * Entry point
 * @param event Input provided to the custom resource
 * @param _context AWS Lambda context
 * @returns CdkCustomResourceResponse
 */
export async function handler(
  event: CdkCustomResourceEvent<CustomResourceProperties>,
  _context: Context,
): Promise<CdkCustomResourceResponse> {
  console.info("CloudFormation event received:", JSON.stringify(event));

  switch (event.RequestType) {
    case "Create":
    case "Update":
      return onCreateUpdate(event);
    case "Delete":
      return onDelete(event);
  }
}
