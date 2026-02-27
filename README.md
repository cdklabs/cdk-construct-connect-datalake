<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
-->

# Amazon Connect Data Lake CDK Construct

An [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) construct that enables access to [Amazon Connect analytics data lake](https://docs.aws.amazon.com/connect/latest/adminguide/data-lake.html). This solution automates the complete Connect Data Lake setup process, eliminating the need for
manual configuration or custom [CloudFormation](https://aws.amazon.com/cloudformation/) templates.

The construct uses a Lambda-backed custom resource to manage the deployment process. It handles associating [Connect](https://aws.amazon.com/connect/)
datasets, accepting [RAM](https://aws.amazon.com/ram/) resource shares, granting [Lake Formation](https://aws.amazon.com/lake-formation/) permissions, and creating resource link tables in a
centralized [Glue](https://aws.amazon.com/glue/) database—with support for same-account and cross-account configurations.


## Usage

### Prerequisites

- [Amazon Connect instance](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-instances.html)
- [AWS CDK v2](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
- For cross-account setups: An IAM role in the target account. See [Cross Account Setup](CROSS_ACCOUNT_SETUP.md) documentation

### Installation

Install the construct library in your CDK project directory:

<details>
<summary>TypeScript/JavaScript</summary>

```bash
npm install @cdklabs/cdk-construct-connect-datalake
```

</details>

<details>
<summary>Python</summary>

```bash
pip install cdklabs.cdk-construct-connect-datalake
```

</details>

<details>
<summary>Java</summary>

Add the following dependency to your `pom.xml`:

```xml
<dependency>
  <groupId>io.github.cdklabs</groupId>
  <artifactId>cdk-construct-connect-datalake</artifactId>
  <version>VERSION</version>
</dependency>
```

</details>

<details>
<summary>.NET</summary>

```bash
dotnet add package Cdklabs.CdkConstructConnectDatalake
```

</details>

<details>
<summary>Go</summary>

```bash
go get github.com/cdklabs/cdk-construct-connect-datalake-go/cdkconstructconnectdatalake
```

</details>

### Basic Usage

Add the DataLakeAccess construct to a CDK stack deployed in the same AWS account and region as your Amazon Connect instance.

```typescript
import { DataLakeAccess, DataType } from '@cdklabs/cdk-construct-connect-datalake';

new DataLakeAccess(this, 'DataLakeAccess', {
  instanceId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Your Connect instance ID
  datasetIds: [
    DataType.CONTACT_RECORD,
    'contact_statistic_record',
  ],
});
```
**Important**: When deploying alongside a Connect instance in the same stack, add a dependency to the construct:

<details>
<summary>Example</summary>

```typescript
import { DataLakeAccess, DataType } from '@cdklabs/cdk-construct-connect-datalake';
import { CfnInstance } from 'aws-cdk-lib/aws-connect';

const connectInstance = new CfnInstance(this, 'ConnectInstance', {
  identityManagementType: 'CONNECT_MANAGED',
  instanceAlias: 'my-instance',
  attributes: {
    inboundCalls: true,
    outboundCalls: true,
  },
});

const dataLake = new DataLakeAccess(this, 'DataLakeAccess', {
  instanceId: connectInstance.attrId,
  datasetIds: [DataType.CONTACT_RECORD],
});

// Ensure data lake resources are deleted before the Connect instance
dataLake.node.addDependency(connectInstance);
```

</details>

### Cross-Account Configuration

Configure the construct to create data lake resources in a different AWS account by specifying `targetAccountId` and `targetAccountRoleArn`. The construct assumes the target role to accept the RAM resource share(s) and create Glue resources in that account.

```typescript
import { DataLakeAccess, DataType } from '@cdklabs/cdk-construct-connect-datalake';

new DataLakeAccess(this, 'DataLakeAccess', {
  instanceId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  datasetIds: [
    DataType.CONTACT_RECORD,
    'contact_statistic_record',
  ],

  // Target account where the resources are created
  targetAccountId: '123456789012', 
  
  // IAM role in the target account for cross-account role assumption
  targetAccountRoleArn: "arn:aws:iam::123456789012:role/RoleName",
});
```

### Multiple Instances

Enable data lake access for multiple Connect instances by creating a separate construct for each. A dependency should be added between them to ensure sequential deployment, preventing conflicts from concurrent operations.

```typescript
import { DataLakeAccess, DataType } from '@cdklabs/cdk-construct-connect-datalake';

// First Connect instance data lake setup
const dataLake1 = new DataLakeAccess(this, 'DataLakeAccess1', {
  instanceId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  datasetIds: [
    DataType.CONTACT_RECORD,
    DataType.AGENT_STATISTIC_RECORD,
  ],
});

// Second Connect instance data lake setup 
const dataLake2 = new DataLakeAccess(this, 'DataLakeAccess2', {
  instanceId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
  datasetIds: [
    DataType.CONTACT_RECORD,
    DataType.CONTACT_FLOW_EVENTS,
  ],
});

// Create dependency to ensure sequential deployment
dataLake2.node.addDependency(dataLake1);
```

## API Reference

### DataLakeAccess

The main construct class for setting up Amazon Connect Data Lake integration.

**Properties:**

- `instanceId` ([string](API.md#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.property.instanceId)): Amazon Connect instance ID
- `datasetIds` ([Array<string | DataType>](API.md#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.datasetIds)): Array of dataset IDs to associate. Use `DataType` enum values or string literals for datasets not yet in the enum.
- `targetAccountId?` ([string](API.md#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountId)): Target AWS account ID receiving resources (optional)
- `targetAccountRoleArn?` ([string](API.md#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountRoleArn)): IAM role ARN in the target account for cross-account role assumption (optional)

### DataType Enum

For a list of supported dataset types, see the [API Documentation](API.md#@cdklabs/cdk-construct-connect-datalake.DataType).

## Resources Created

This construct creates the following AWS resources:

### Infrastructure Components
- **CloudFormation Custom Resource Provider**: Framework for managing custom resource lifecycle
- **Lambda Function**: Custom resource handler that orchestrates the data lake setup
- **IAM Role**: Execution role with permissions for Connect, RAM, Glue, and Lake Formation operations

  <details>
  <summary>Show IAM permissions</summary>

  - `connect:BatchAssociateAnalyticsDataSet`
  - `connect:AssociateAnalyticsDataSet`
  - `connect:BatchDisassociateAnalyticsDataSet`
  - `connect:DisassociateAnalyticsDataSet`
  - `connect:ListAnalyticsDataAssociations`
  - `connect:ListAnalyticsDataLakeDataSets`
  - `connect:ListInstances`
  - `ds:DescribeDirectories`
  - `ram:AcceptResourceShareInvitation`
  - `ram:GetResourceShareInvitations`
  - `ram:GetResourceShares`
  - `glue:CreateDatabase`
  - `glue:CreateTable`
  - `glue:DeleteDatabase`
  - `glue:DeleteTable`
  - `glue:GetDatabase`
  - `glue:GetTables`
  - `lakeformation:GetDataLakeSettings`
  - `lakeformation:PutDataLakeSettings`
  - `cloudformation:DescribeStacks`
  - `sts:AssumeRole` (for cross-account setups only)

  </details>

### Deployment Workflow
The construct performs the following steps during deployment:

![Deployment Workflow](resources/workflow.png)

1. **Dataset Association**: Associates the specified datasets for an Amazon Connect instance with the target account
2. **Database Creation**: Creates the `connect_datalake_database` Glue database
3. **Lake Formation Setup**: Configures the Lambda execution role (or assumed role for cross-account) as a data lake administrator
4. **Resource Share Acceptance**: Accepts the RAM resource share invitation(s). Multiple dataset associations often consolidate into a single RAM resource share
5. **Table Creation**: Creates resource link tables for each dataset, enabling queries via Amazon Athena

When deploying to the same account as the Connect instance, all steps execute within that account. For cross-account configurations, steps 2-5 execute in the target account.

### Limitations
- **Table Naming**: Resource link tables created by this construct are named using the format `{datasetId}_{dataCatalogId}`
- **Region Support**: The construct must be deployed in the same AWS region and account as the Amazon Connect instance. For cross-account configurations, resources are created in the target account within the same region
- **Shared Database**: The `connect_datalake_database` Glue database is shared across all deployments of this construct in an account

## Troubleshooting

**RAM resource share has expired**
- Resource shares for new dataset associations can consolidate into existing AWS RAM shares, even if expired. Delete
  each construct that references the target account, confirm the associated resources are removed, then redeploy using
  the original construct definitions.

**Failure to update Lake Formation permissions due to invalid principal**
- IAM roles that have been deleted but not removed from Lake Formation principals will be considered invalid. Remove the
  principal causing this error from Lake Formation and redeploy the construct.

**Resources are unable to be removed after a Connect instance has been deleted**
- Constructs of this type must be deleted prior to deleting the instance, as cleanup after instance deletion is currently
  not supported. A GitHub issue can be raised if assistance removing these resources is required.

## Support

For issues and questions:

- Reference the documentation for the analytics data lake in the [Amazon Connect Administrator Guide](https://docs.aws.amazon.com/connect/latest/adminguide/data-lake.html)
- Check the [API Documentation](API.md)
- Report bugs via [GitHub Issues](https://github.com/cdklabs/cdk-construct-connect-datalake/issues)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the [Apache-2.0 License](LICENSE).