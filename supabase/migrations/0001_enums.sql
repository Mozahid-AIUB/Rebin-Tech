create type role_enum as enum (
  'platform_owner','platform_ops','platform_finance','platform_support',
  'org_owner','org_admin','org_requester',
  'biz_owner','biz_staff',
  'field_agent','field_lead'
);
create type scope_enum as enum ('platform','organization','business','self');
create type account_status_enum as enum ('pending_verification','active','suspended','rejected','archived');
create type request_status_enum as enum ('pending','under_review','scheduled','dispatched','in_transit','completed','cancelled');
create type org_type_enum as enum ('k12_school','university','hospital','municipal_office','corporate_hq','other');
create type size_tier_enum as enum ('tier_10_30','tier_30_100','tier_100_300','tier_300_plus');
create type device_category_enum as enum ('computers_laptops','monitors_displays','server_gear','copiers_printers','batteries_ups');
