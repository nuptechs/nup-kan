-- 🚀 PERMISSIONS MANAGEMENT VIEW SETUP
-- Ultra-optimized materialized view with triggers for instant permission lookups

-- Drop existing view and triggers if they exist
DROP MATERIALIZED VIEW IF EXISTS permissions_management_view CASCADE;
DROP FUNCTION IF EXISTS refresh_permissions_view CASCADE;

-- Create the materialized view
CREATE MATERIALIZED VIEW permissions_management_view AS
SELECT DISTINCT
  -- User info
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  u.status as user_status,
  u.profile_id as user_profile_id,
  up.name as user_profile_name,
  
  -- Team info  
  ut.team_id,
  t.name as team_name,
  ut.role as user_team_role,
  
  -- Team profile info
  tp.profile_id as team_profile_id,
  tpp.name as team_profile_name,
  
  -- Permission info
  pp.permission_id,
  perm.name as permission_name,
  perm.category as permission_category,
  CASE 
    WHEN pp.profile_id = u.profile_id THEN 'user_profile'
    WHEN pp.profile_id = tp.profile_id THEN 'team_profile'
    ELSE 'unknown'
  END as permission_source,
  
  -- Profile info (consolidated)
  COALESCE(up.id, tpp.id) as profile_id,
  COALESCE(up.name, tpp.name) as profile_name,
  COALESCE(up.description, tpp.description) as profile_description,
  
  -- Metadata
  NOW() as last_updated

FROM users u

-- User's direct profile and permissions
LEFT JOIN profiles up ON u.profile_id = up.id
LEFT JOIN profile_permissions upp ON up.id = upp.profile_id
LEFT JOIN permissions uperm ON upp.permission_id = uperm.id

-- User's teams
LEFT JOIN user_teams ut ON u.id = ut.user_id
LEFT JOIN teams t ON ut.team_id = t.id

-- Team profiles and their permissions  
LEFT JOIN team_profiles tp ON t.id = tp.team_id
LEFT JOIN profiles tpp ON tp.profile_id = tpp.id
LEFT JOIN profile_permissions tppp ON tpp.id = tppp.profile_id
LEFT JOIN permissions tperm ON tppp.permission_id = tperm.id

-- Consolidate permissions from both sources
LEFT JOIN profile_permissions pp ON (pp.profile_id = up.id OR pp.profile_id = tpp.id)
LEFT JOIN permissions perm ON pp.permission_id = perm.id

-- Include all users, even those without permissions
WHERE u.id IS NOT NULL

ORDER BY u.name, t.name, perm.category, perm.name;

-- Create unique index for performance
CREATE UNIQUE INDEX idx_permissions_mgmt_unique 
ON permissions_management_view (user_id, COALESCE(team_id, ''), COALESCE(permission_id, ''));

-- Create additional indexes for common queries
CREATE INDEX idx_permissions_mgmt_user_id ON permissions_management_view (user_id);
CREATE INDEX idx_permissions_mgmt_team_id ON permissions_management_view (team_id);
CREATE INDEX idx_permissions_mgmt_permission ON permissions_management_view (permission_id, permission_category);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_permissions_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY permissions_management_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically refresh the view when data changes

-- User changes
CREATE TRIGGER trigger_refresh_permissions_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Profile changes
CREATE TRIGGER trigger_refresh_permissions_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Permission changes
CREATE TRIGGER trigger_refresh_permissions_permissions
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Profile-Permission relationship changes
CREATE TRIGGER trigger_refresh_permissions_profile_permissions
  AFTER INSERT OR UPDATE OR DELETE ON profile_permissions
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Team changes
CREATE TRIGGER trigger_refresh_permissions_teams
  AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- User-Team relationship changes
CREATE TRIGGER trigger_refresh_permissions_user_teams
  AFTER INSERT OR UPDATE OR DELETE ON user_teams
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Team-Profile relationship changes
CREATE TRIGGER trigger_refresh_permissions_team_profiles
  AFTER INSERT OR UPDATE OR DELETE ON team_profiles
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_permissions_view();

-- Manual refresh function (for debugging)
CREATE OR REPLACE FUNCTION manual_refresh_permissions_view()
RETURNS TEXT AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY permissions_management_view;
  RETURN 'Permissions management view refreshed successfully at ' || NOW();
END;
$$ LANGUAGE plpgsql;

-- Initial population of the view
REFRESH MATERIALIZED VIEW permissions_management_view;

-- Grant permissions
GRANT SELECT ON permissions_management_view TO PUBLIC;

COMMENT ON MATERIALIZED VIEW permissions_management_view IS 
'Optimized materialized view for permissions management interface. 
Auto-refreshes via triggers when related data changes.';