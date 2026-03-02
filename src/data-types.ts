// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Amazon Connect analytics dataset types
 *
 * These enum values represent the available dataset types that can be associated with Amazon Connect instances
 * for data lake integration. The dataset types are updated periodically as new analytics capabilities are added
 * to Amazon Connect. String values can be used for dataset types not included in this enum
 *
 * Regional availability varies by dataset type
 */
export enum DataType {
  CONTACT_RECORD = "contact_record",
  AGENT_QUEUE_STATISTIC_RECORD = "agent_queue_statistic_record",
  AGENT_STATISTIC_RECORD = "agent_statistic_record",
  CONTACT_STATISTIC_RECORD = "contact_statistic_record",
  CONTACT_EVALUATION_RECORD = "contact_evaluation_record",
  CONTACT_LENS_CONVERSATIONAL_ANALYTICS = "contact_lens_conversational_analytics",
  CONTACT_FLOW_EVENTS = "contact_flow_events",
  OUTBOUND_CAMPAIGN_EVENTS = "outbound_campaign_events",
  FORECAST_GROUPS = "forecast_groups",
  LONG_TERM_FORECASTS = "long_term_forecasts",
  SHORT_TERM_FORECASTS = "short_term_forecasts",
  STAFF_SHIFTS = "staff_shifts",
  STAFF_SHIFT_ACTIVITIES = "staff_shift_activities",
  STAFF_TIMEOFFS = "staff_timeoffs",
  STAFF_TIMEOFF_INTERVALS = "staff_timeoff_intervals",
  STAFF_TIMEOFF_BALANCE_CHANGES = "staff_timeoff_balance_changes",
  SHIFT_ACTIVITIES = "shift_activities",
  SHIFT_PROFILES = "shift_profiles",
  STAFF_SCHEDULING_PROFILE = "staff_scheduling_profile",
  STAFFING_GROUP_FORECAST_GROUPS = "staffing_group_forecast_groups",
  STAFFING_GROUP_SUPERVISORS = "staffing_group_supervisors",
  STAFFING_GROUPS = "staffing_groups",
  BOT_CONVERSATIONS = "bot_conversations",
  BOT_INTENTS = "bot_intents",
  BOT_SLOTS = "bot_slots",
  INTRADAY_FORECASTS = "intraday_forecasts",
  USERS = "users",
  ROUTING_PROFILES = "routing_profiles",
  AGENT_HIERARCHY_GROUPS = "agent_hierarchy_groups",
  AI_AGENT = "ai_agent",
  AI_TOOL = "ai_tool",
  AI_PROMPT = "ai_prompt",
  AI_SESSION = "ai_session",
  AI_AGENT_KNOWLEDGE_BASE = "ai_agent_knowledge_base",
  STAFFING_GROUP_DEMAND_GROUP = "staffing_group_demand_group",
  DEMAND_GROUP = "demand_group",
  DEMAND_GROUP_DEFINITIONS = "demand_group_definitions",
  STAFF_DEMAND_GROUP = "staff_demand_group",
  STAFF_SHIFT_ACTIVITY_ALLOCATIONS = "staff_shift_activity_allocations",
  CONNECT_TEST_CASE_RESULTS = "connect_test_case_results",
}
