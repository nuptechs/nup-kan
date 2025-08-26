// ✅ SIMPLE & FAST Permissions data endpoint - back to basics that work
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

// Smart cache with immediate invalidation
let permissionsCache: PermissionsData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds - longer cache for stability

export async function getPermissionsData(req: Request, res: Response) {
  try {
    // Check cache first
    const now = Date.now();
    if (permissionsCache && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('⚡ [PERMISSIONS-DATA] Cache hit - instant response');
      return res.json(permissionsCache);
    }

    console.log('🔄 [PERMISSIONS-DATA] Cache miss - fetching with simple queries');
    const startTime = Date.now();

    // ✅ SIMPLE APPROACH: Direct parallel queries (fastest for small datasets)
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
      storage.getProfiles(),        // ✅ COMPLETOS com cores
      storage.getUsers(), 
      storage.getTeams(),           // ✅ COMPLETOS com descrições
      storage.getAllUserTeams(),
      storage.getAllTeamProfiles(),
      storage.getAllProfilePermissions()
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
    console.log(`⚡ [PERMISSIONS-DATA] Simple queries completed in ${duration}ms`);

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