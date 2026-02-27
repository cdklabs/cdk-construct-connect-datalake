<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
-->

# Cross-Account Setup Guide

## Target Account Role Setup

Create an IAM role in the target account with the following policies:

### Trust Relationship
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::LAMBDA_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Permissions Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ram:GetResourceShareInvitations",
        "ram:GetResourceShares",
        "ram:ListResources"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "ram:AcceptResourceShareInvitation",
      "Resource": "arn:aws:ram:REGION:*:resource-share-invitation/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lakeformation:GetDataLakeSettings",
        "lakeformation:PutDataLakeSettings"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:CreateDatabase",
        "glue:DeleteDatabase",
        "glue:CreateTable",
        "glue:DeleteTable",
        "glue:GetTables"
      ],
      "Resource": [
        "arn:aws:glue:REGION:TARGET_ACCOUNT_ID:database/connect_datalake_database",
        "arn:aws:glue:REGION:TARGET_ACCOUNT_ID:table/connect_datalake_database/*",
        "arn:aws:glue:REGION:TARGET_ACCOUNT_ID:userDefinedFunction/connect_datalake_database/*",
        "arn:aws:glue:REGION:TARGET_ACCOUNT_ID:catalog"
      ]
    }
  ]
}
```

#### Replace:
- `LAMBDA_ACCOUNT_ID` with the account ID where the Lambda function runs
- `REGION` with the AWS region (e.g., us-east-1)
- `TARGET_ACCOUNT_ID` with the target account ID where data lake resources will be created