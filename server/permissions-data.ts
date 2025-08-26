// Consolidated permissions data endpoint for optimal performance
import { Request, Response } from 'express';
import { storage } from './storage';

interface PermissionsData {
  permissions: any[];
  profiles: any[];
  users: any[];
  teams: any[];
  userTeams: any[];
  teamProfiles: any[];
  profilePermissions: any[];
}

// Cache for permissions data
let permissionsCache: PermissionsData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function getPermissionsData(req: Request, res: Response) {
  try {
    // Use the existing storage instance
    const store = storage;
    
    // Check cache first
    const now = Date.now();
    if (permissionsCache && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('🚀 [PERMISSIONS-DATA] Cache hit - returning cached data');
      return res.json(permissionsCache);
    }

    console.log('🔄 [PERMISSIONS-DATA] Cache miss - fetching fresh data');
    const startTime = Date.now();

    // Single optimized query to fetch all data
    const [
      permissions,
      profiles, 
      users,
      teams,
      userTeams,
      teamProfiles,
      profilePermissions
    ] = await Promise.all([
      store.getPermissions(),
      store.getProfiles(),
      store.getUsers(),
      store.getTeams(),
      store.getAllUserTeams(),
      store.getAllTeamProfiles(),
      store.getAllProfilePermissions()
    ]);

    const data: PermissionsData = {
      permissions,
      profiles,
      users,
      teams,
      userTeams,
      teamProfiles,
      profilePermissions
    };

    // Update cache
    permissionsCache = data;
    cacheTimestamp = now;

    const duration = Date.now() - startTime;
    console.log(`⚡ [PERMISSIONS-DATA] Fetched all data in ${duration}ms`);

    res.json(data);
  } catch (error) {
    console.error('❌ [PERMISSIONS-DATA] Error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions data' });
  }
}

// Function to invalidate cache when data changes
export function invalidatePermissionsCache() {
  permissionsCache = null;
  console.log('🔄 [PERMISSIONS-DATA] Cache invalidated');
}