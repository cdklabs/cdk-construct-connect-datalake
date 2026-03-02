# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### DataLakeAccess <a name="DataLakeAccess" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess"></a>

Automates Amazon Connect Data Lake integration setup and management.

This construct simplifies the process of associating Amazon Connect analytics datasets with AWS data lake services,
handling resource sharing, Lake Formation permissions, and data catalog management through a centralized Glue database.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer"></a>

```typescript
import { DataLakeAccess } from '@cdklabs/cdk-construct-connect-datalake'

new DataLakeAccess(scope: Construct, id: string, props: DataLakeAccessProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | Parent to which the Custom Resource belongs. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.id">id</a></code> | <code>string</code> | Unique identifier for this instance. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.props">props</a></code> | <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps">DataLakeAccessProps</a></code> | Metadata for configuring the Custom Resource. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

Parent to which the Custom Resource belongs.

---

##### `id`<sup>Required</sup> <a name="id" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.id"></a>

- *Type:* string

Unique identifier for this instance.

---

##### `props`<sup>Required</sup> <a name="props" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.Initializer.parameter.props"></a>

- *Type:* <a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps">DataLakeAccessProps</a>

Metadata for configuring the Custom Resource.

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.with">with</a></code> | Applies one or more mixins to this construct. |

---

##### `toString` <a name="toString" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.with.parameter.mixins"></a>

- *Type:* ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.isConstruct"></a>

```typescript
import { DataLakeAccess } from '@cdklabs/cdk-construct-connect-datalake'

DataLakeAccess.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccess.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### DataLakeAccessProps <a name="DataLakeAccessProps" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps"></a>

Properties for the DataLakeAccess construct.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.Initializer"></a>

```typescript
import { DataLakeAccessProps } from '@cdklabs/cdk-construct-connect-datalake'

const dataLakeAccessProps: DataLakeAccessProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.datasetIds">datasetIds</a></code> | <code>string[]</code> | Array of dataset IDs to associate with the Connect instance. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.instanceId">instanceId</a></code> | <code>string</code> | The identifier of the Amazon Connect instance. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountId">targetAccountId</a></code> | <code>string</code> | The identifier of the target account. |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountRoleArn">targetAccountRoleArn</a></code> | <code>string</code> | The IAM role ARN in the target account for cross-account role assumption. |

---

##### `datasetIds`<sup>Required</sup> <a name="datasetIds" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.datasetIds"></a>

```typescript
public readonly datasetIds: string[];
```

- *Type:* string[]

Array of dataset IDs to associate with the Connect instance.

Can include DataType enum values or string dataset IDs

---

##### `instanceId`<sup>Required</sup> <a name="instanceId" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.instanceId"></a>

```typescript
public readonly instanceId: string;
```

- *Type:* string

The identifier of the Amazon Connect instance.

---

##### `targetAccountId`<sup>Optional</sup> <a name="targetAccountId" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountId"></a>

```typescript
public readonly targetAccountId: string;
```

- *Type:* string

The identifier of the target account.

If not specified, defaults to the current AWS account. For cross-account setups,
specify an external account ID to associate datasets and create resources in that account

When specified with an external account, `targetAccountRoleArn` is also required

---

##### `targetAccountRoleArn`<sup>Optional</sup> <a name="targetAccountRoleArn" id="@cdklabs/cdk-construct-connect-datalake.DataLakeAccessProps.property.targetAccountRoleArn"></a>

```typescript
public readonly targetAccountRoleArn: string;
```

- *Type:* string

The IAM role ARN in the target account for cross-account role assumption.

Only required when `targetAccountId` is specified with an external account. A template
for the required permissions can be found in the [Cross Account Setup](../CROSS_ACCOUNT_SETUP.md) documentation

---



## Enums <a name="Enums" id="Enums"></a>

### DataType <a name="DataType" id="@cdklabs/cdk-construct-connect-datalake.DataType"></a>

Amazon Connect analytics dataset types.

These enum values represent the available dataset types that can be associated with Amazon Connect instances
for data lake integration. The dataset types are updated periodically as new analytics capabilities are added
to Amazon Connect. String values can be used for dataset types not included in this enum

Regional availability varies by dataset type

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_RECORD">CONTACT_RECORD</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_QUEUE_STATISTIC_RECORD">AGENT_QUEUE_STATISTIC_RECORD</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_STATISTIC_RECORD">AGENT_STATISTIC_RECORD</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_STATISTIC_RECORD">CONTACT_STATISTIC_RECORD</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_EVALUATION_RECORD">CONTACT_EVALUATION_RECORD</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_LENS_CONVERSATIONAL_ANALYTICS">CONTACT_LENS_CONVERSATIONAL_ANALYTICS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_FLOW_EVENTS">CONTACT_FLOW_EVENTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.OUTBOUND_CAMPAIGN_EVENTS">OUTBOUND_CAMPAIGN_EVENTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.FORECAST_GROUPS">FORECAST_GROUPS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.LONG_TERM_FORECASTS">LONG_TERM_FORECASTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.SHORT_TERM_FORECASTS">SHORT_TERM_FORECASTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFTS">STAFF_SHIFTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFT_ACTIVITIES">STAFF_SHIFT_ACTIVITIES</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFFS">STAFF_TIMEOFFS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFF_INTERVALS">STAFF_TIMEOFF_INTERVALS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFF_BALANCE_CHANGES">STAFF_TIMEOFF_BALANCE_CHANGES</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.SHIFT_ACTIVITIES">SHIFT_ACTIVITIES</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.SHIFT_PROFILES">SHIFT_PROFILES</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SCHEDULING_PROFILE">STAFF_SCHEDULING_PROFILE</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_FORECAST_GROUPS">STAFFING_GROUP_FORECAST_GROUPS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_SUPERVISORS">STAFFING_GROUP_SUPERVISORS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUPS">STAFFING_GROUPS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.BOT_CONVERSATIONS">BOT_CONVERSATIONS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.BOT_INTENTS">BOT_INTENTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.BOT_SLOTS">BOT_SLOTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.INTRADAY_FORECASTS">INTRADAY_FORECASTS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.USERS">USERS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.ROUTING_PROFILES">ROUTING_PROFILES</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_HIERARCHY_GROUPS">AGENT_HIERARCHY_GROUPS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AI_AGENT">AI_AGENT</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AI_TOOL">AI_TOOL</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AI_PROMPT">AI_PROMPT</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AI_SESSION">AI_SESSION</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.AI_AGENT_KNOWLEDGE_BASE">AI_AGENT_KNOWLEDGE_BASE</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_DEMAND_GROUP">STAFFING_GROUP_DEMAND_GROUP</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.DEMAND_GROUP">DEMAND_GROUP</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.DEMAND_GROUP_DEFINITIONS">DEMAND_GROUP_DEFINITIONS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_DEMAND_GROUP">STAFF_DEMAND_GROUP</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFT_ACTIVITY_ALLOCATIONS">STAFF_SHIFT_ACTIVITY_ALLOCATIONS</a></code> | *No description.* |
| <code><a href="#@cdklabs/cdk-construct-connect-datalake.DataType.CONNECT_TEST_CASE_RESULTS">CONNECT_TEST_CASE_RESULTS</a></code> | *No description.* |

---

##### `CONTACT_RECORD` <a name="CONTACT_RECORD" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_RECORD"></a>

---


##### `AGENT_QUEUE_STATISTIC_RECORD` <a name="AGENT_QUEUE_STATISTIC_RECORD" id="@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_QUEUE_STATISTIC_RECORD"></a>

---


##### `AGENT_STATISTIC_RECORD` <a name="AGENT_STATISTIC_RECORD" id="@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_STATISTIC_RECORD"></a>

---


##### `CONTACT_STATISTIC_RECORD` <a name="CONTACT_STATISTIC_RECORD" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_STATISTIC_RECORD"></a>

---


##### `CONTACT_EVALUATION_RECORD` <a name="CONTACT_EVALUATION_RECORD" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_EVALUATION_RECORD"></a>

---


##### `CONTACT_LENS_CONVERSATIONAL_ANALYTICS` <a name="CONTACT_LENS_CONVERSATIONAL_ANALYTICS" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_LENS_CONVERSATIONAL_ANALYTICS"></a>

---


##### `CONTACT_FLOW_EVENTS` <a name="CONTACT_FLOW_EVENTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONTACT_FLOW_EVENTS"></a>

---


##### `OUTBOUND_CAMPAIGN_EVENTS` <a name="OUTBOUND_CAMPAIGN_EVENTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.OUTBOUND_CAMPAIGN_EVENTS"></a>

---


##### `FORECAST_GROUPS` <a name="FORECAST_GROUPS" id="@cdklabs/cdk-construct-connect-datalake.DataType.FORECAST_GROUPS"></a>

---


##### `LONG_TERM_FORECASTS` <a name="LONG_TERM_FORECASTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.LONG_TERM_FORECASTS"></a>

---


##### `SHORT_TERM_FORECASTS` <a name="SHORT_TERM_FORECASTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.SHORT_TERM_FORECASTS"></a>

---


##### `STAFF_SHIFTS` <a name="STAFF_SHIFTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFTS"></a>

---


##### `STAFF_SHIFT_ACTIVITIES` <a name="STAFF_SHIFT_ACTIVITIES" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFT_ACTIVITIES"></a>

---


##### `STAFF_TIMEOFFS` <a name="STAFF_TIMEOFFS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFFS"></a>

---


##### `STAFF_TIMEOFF_INTERVALS` <a name="STAFF_TIMEOFF_INTERVALS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFF_INTERVALS"></a>

---


##### `STAFF_TIMEOFF_BALANCE_CHANGES` <a name="STAFF_TIMEOFF_BALANCE_CHANGES" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_TIMEOFF_BALANCE_CHANGES"></a>

---


##### `SHIFT_ACTIVITIES` <a name="SHIFT_ACTIVITIES" id="@cdklabs/cdk-construct-connect-datalake.DataType.SHIFT_ACTIVITIES"></a>

---


##### `SHIFT_PROFILES` <a name="SHIFT_PROFILES" id="@cdklabs/cdk-construct-connect-datalake.DataType.SHIFT_PROFILES"></a>

---


##### `STAFF_SCHEDULING_PROFILE` <a name="STAFF_SCHEDULING_PROFILE" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SCHEDULING_PROFILE"></a>

---


##### `STAFFING_GROUP_FORECAST_GROUPS` <a name="STAFFING_GROUP_FORECAST_GROUPS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_FORECAST_GROUPS"></a>

---


##### `STAFFING_GROUP_SUPERVISORS` <a name="STAFFING_GROUP_SUPERVISORS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_SUPERVISORS"></a>

---


##### `STAFFING_GROUPS` <a name="STAFFING_GROUPS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUPS"></a>

---


##### `BOT_CONVERSATIONS` <a name="BOT_CONVERSATIONS" id="@cdklabs/cdk-construct-connect-datalake.DataType.BOT_CONVERSATIONS"></a>

---


##### `BOT_INTENTS` <a name="BOT_INTENTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.BOT_INTENTS"></a>

---


##### `BOT_SLOTS` <a name="BOT_SLOTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.BOT_SLOTS"></a>

---


##### `INTRADAY_FORECASTS` <a name="INTRADAY_FORECASTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.INTRADAY_FORECASTS"></a>

---


##### `USERS` <a name="USERS" id="@cdklabs/cdk-construct-connect-datalake.DataType.USERS"></a>

---


##### `ROUTING_PROFILES` <a name="ROUTING_PROFILES" id="@cdklabs/cdk-construct-connect-datalake.DataType.ROUTING_PROFILES"></a>

---


##### `AGENT_HIERARCHY_GROUPS` <a name="AGENT_HIERARCHY_GROUPS" id="@cdklabs/cdk-construct-connect-datalake.DataType.AGENT_HIERARCHY_GROUPS"></a>

---


##### `AI_AGENT` <a name="AI_AGENT" id="@cdklabs/cdk-construct-connect-datalake.DataType.AI_AGENT"></a>

---


##### `AI_TOOL` <a name="AI_TOOL" id="@cdklabs/cdk-construct-connect-datalake.DataType.AI_TOOL"></a>

---


##### `AI_PROMPT` <a name="AI_PROMPT" id="@cdklabs/cdk-construct-connect-datalake.DataType.AI_PROMPT"></a>

---


##### `AI_SESSION` <a name="AI_SESSION" id="@cdklabs/cdk-construct-connect-datalake.DataType.AI_SESSION"></a>

---


##### `AI_AGENT_KNOWLEDGE_BASE` <a name="AI_AGENT_KNOWLEDGE_BASE" id="@cdklabs/cdk-construct-connect-datalake.DataType.AI_AGENT_KNOWLEDGE_BASE"></a>

---


##### `STAFFING_GROUP_DEMAND_GROUP` <a name="STAFFING_GROUP_DEMAND_GROUP" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFFING_GROUP_DEMAND_GROUP"></a>

---


##### `DEMAND_GROUP` <a name="DEMAND_GROUP" id="@cdklabs/cdk-construct-connect-datalake.DataType.DEMAND_GROUP"></a>

---


##### `DEMAND_GROUP_DEFINITIONS` <a name="DEMAND_GROUP_DEFINITIONS" id="@cdklabs/cdk-construct-connect-datalake.DataType.DEMAND_GROUP_DEFINITIONS"></a>

---


##### `STAFF_DEMAND_GROUP` <a name="STAFF_DEMAND_GROUP" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_DEMAND_GROUP"></a>

---


##### `STAFF_SHIFT_ACTIVITY_ALLOCATIONS` <a name="STAFF_SHIFT_ACTIVITY_ALLOCATIONS" id="@cdklabs/cdk-construct-connect-datalake.DataType.STAFF_SHIFT_ACTIVITY_ALLOCATIONS"></a>

---


##### `CONNECT_TEST_CASE_RESULTS` <a name="CONNECT_TEST_CASE_RESULTS" id="@cdklabs/cdk-construct-connect-datalake.DataType.CONNECT_TEST_CASE_RESULTS"></a>

---

