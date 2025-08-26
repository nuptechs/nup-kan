// 🚀 ULTRA-OPTIMIZED Permissions data endpoint using materialized view
import { Request, Response } from 'express';
import { storage } from './storage';
import type { PermissionsManagementData } from '@shared/schema';

interface OptimizedPermissionsData {
  // Raw view data for complex processing  
  viewData: PermissionsManagementData[];
  
  // Pre-processed data for UI (backward compatibility)
  permissions: any[];
  profiles: any[];
  users: any[];
  teams: any[];
  userTeams: any[];
  teamProfiles: any[];
  profilePermissions: any[];
}

// Cache for permissions data
let permissionsCache: OptimizedPermissionsData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10000; // 10 seconds (longer cache since view auto-updates)

export async function getPermissionsData(req: Request, res: Response) {
  try {
    // Check cache first
    const now = Date.now();
    if (permissionsCache && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('🚀 [PERMISSIONS-DATA] Cache hit - returning cached view data');
      return res.json(permissionsCache);
    }

    console.log('🔄 [PERMISSIONS-DATA] Cache miss - fetching from materialized view');
    const startTime = Date.now();

    try {
      // 🚀 SINGLE ULTRA-FAST QUERY - Get all data from materialized view
      const viewData = await storage.getPermissionsManagementData();
      
      // Process view data into backward-compatible format for existing UI
      const processedData = processViewData(viewData);
      
      const data: OptimizedPermissionsData = {
        viewData,
        ...processedData
      };

      // Update cache
      permissionsCache = data;
      cacheTimestamp = now;

      const duration = Date.now() - startTime;
      console.log(`⚡ [PERMISSIONS-DATA] View query completed in ${duration}ms (${viewData.length} records)`);

      res.json(data);
      
    } catch (viewError) {
      // Fallback to old method if view doesn't exist yet
      console.warn('📋 [PERMISSIONS-DATA] View not available, falling back to legacy queries');
      return legacyGetPermissionsData(req, res);
    }
    
  } catch (error) {
    console.error('❌ [PERMISSIONS-DATA] Error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions data' });
  }
}

// Process view data into UI-compatible format
function processViewData(viewData: PermissionsManagementData[]) {
  const permissions = new Map();
  const profiles = new Map(); 
  const users = new Map();
  const teams = new Map();
  const userTeams: any[] = [];
  const teamProfiles: any[] = [];
  const profilePermissions: any[] = [];

  for (const row of viewData) {
    // Extract unique permissions
    if (row.permissionId && !permissions.has(row.permissionId)) {
      permissions.set(row.permissionId, {
        id: row.permissionId,
        name: row.permissionName,
        category: row.permissionCategory
      });
    }
    
    // Extract unique profiles
    if (row.profileId && !profiles.has(row.profileId)) {
      profiles.set(row.profileId, {
        id: row.profileId,
        name: row.profileName,
        description: row.profileDescription
      });
    }
    
    // Extract unique users
    if (row.userId && !users.has(row.userId)) {
      users.set(row.userId, {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
        status: row.userStatus,
        profileId: row.userProfileId
      });
    }
    
    // Extract unique teams
    if (row.teamId && !teams.has(row.teamId)) {
      teams.set(row.teamId, {
        id: row.teamId,
        name: row.teamName
      });
    }
    
    // Extract user-team relationships
    if (row.userId && row.teamId) {
      userTeams.push({
        userId: row.userId,
        teamId: row.teamId,
        role: row.userTeamRole
      });
    }
    
    // Extract team-profile relationships  
    if (row.teamId && row.teamProfileId) {
      teamProfiles.push({
        teamId: row.teamId,
        profileId: row.teamProfileId
      });
    }
    
    // Extract profile-permission relationships
    if (row.profileId && row.permissionId) {
      profilePermissions.push({
        profileId: row.profileId,
        permissionId: row.permissionId
      });
    }
  }

  return {
    permissions: Array.from(permissions.values()),
    profiles: Array.from(profiles.values()),
    users: Array.from(users.values()),
    teams: Array.from(teams.values()),
    userTeams,
    teamProfiles,
    profilePermissions
  };
}

// Legacy fallback method (7 separate queries)
async function legacyGetPermissionsData(req: Request, res: Response) {
  const startTime = Date.now();
  
  const [
    permissions,
    profiles, 
    users,
    teams,
    userTeams,
    teamProfiles,
    profilePermissions
  ] = await Promise.all([
    storage.getPermissions(),
    storage.getProfiles(),
    storage.getUsers(),
    storage.getTeams(),
    storage.getAllUserTeams(),
    storage.getAllTeamProfiles(),
    storage.getAllProfilePermissions()
  ]);

  const data = {
    viewData: [], // Empty for legacy mode
    permissions,
    profiles,
    users,
    teams,
    userTeams,
    teamProfiles,
    profilePermissions
  };

  const duration = Date.now() - startTime;
  console.log(`⚡ [PERMISSIONS-DATA] Legacy fetch completed in ${duration}ms`);

  res.json(data);
}

// Function to invalidate cache when data changes
export function invalidatePermissionsCache() {
  permissionsCache = null;
  console.log('🔄 [PERMISSIONS-DATA] Cache invalidated');
}