import { Router } from "express";
import type { Request, Response } from "express";
import { auth, requireAuth, createAuthContextFromRequest, AuthRequest } from "../auth/unifiedAuth";
import { db } from "../db";
import { teams, profiles, permissions, userTeams, teamProfiles, profilePermissions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { teamService } from "../services/teamService";
import { profileService } from "../services/profileService";

const router = Router();

// Apply authentication middleware to all routes
router.use(auth); // Popula authContext com dados do JWT
router.use(requireAuth); // Valida se está autenticado

// Teams routes
router.get("/teams", async (req: Request, res: Response) => {
  try {
    const allTeams = await db.select().from(teams);
    res.json(allTeams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

router.get("/teams/:id", async (req: Request, res: Response) => {
  try {
    const [team] = await db.select().from(teams).where(eq(teams.id, req.params.id));
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});

// Profiles routes
router.get("/profiles", async (req: Request, res: Response) => {
  try {
    const allProfiles = await db.select().from(profiles);
    res.json(allProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Failed to fetch profiles" });
  }
});

router.get("/profiles/:id", async (req: Request, res: Response) => {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.params.id));
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Permissions routes
router.get("/permissions", async (req: Request, res: Response) => {
  try {
    const allPermissions = await db.select().from(permissions);
    res.json(allPermissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
});

// User-Teams relationship routes
router.get("/user-teams", async (req: Request, res: Response) => {
  try {
    const allUserTeams = await db.select().from(userTeams);
    res.json(allUserTeams);
  } catch (error) {
    console.error("Error fetching user-teams:", error);
    res.status(500).json({ message: "Failed to fetch user-teams" });
  }
});

// Team-Profiles relationship routes
router.get("/team-profiles", async (req: Request, res: Response) => {
  try {
    const allTeamProfiles = await db.select().from(teamProfiles);
    res.json(allTeamProfiles);
  } catch (error) {
    console.error("Error fetching team-profiles:", error);
    res.status(500).json({ message: "Failed to fetch team-profiles" });
  }
});

// Profile-Permissions relationship routes
router.get("/profile-permissions", async (req: Request, res: Response) => {
  try {
    const allProfilePermissions = await db.select().from(profilePermissions);
    res.json(allProfilePermissions);
  } catch (error) {
    console.error("Error fetching profile-permissions:", error);
    res.status(500).json({ message: "Failed to fetch profile-permissions" });
  }
});

// CRUD Operations for Teams
router.post("/teams", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const newTeam = await teamService.createTeam(authContext, req.body);
    res.status(201).json(newTeam);
  } catch (error) {
    console.error("Error creating team:", error);
    if (error instanceof Error && error.message.includes("Permissão insuficiente")) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: "Dados de time inválidos" });
  }
});

router.patch("/teams/:id", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const updatedTeam = await teamService.updateTeam(authContext, req.params.id, req.body);
    res.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Permissão insuficiente")) {
        return res.status(403).json({ message: error.message });
      }
    }
    res.status(400).json({ message: "Dados de time inválidos" });
  }
});

router.delete("/teams/:id", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    await teamService.deleteTeam(authContext, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting team:", error);
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Permissão insuficiente")) {
        return res.status(403).json({ message: error.message });
      }
    }
    res.status(400).json({ message: "Erro ao excluir time" });
  }
});

// CRUD Operations for Profiles
router.post("/profiles", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const newProfile = await profileService.createProfile(authContext, req.body);
    res.status(201).json(newProfile);
  } catch (error) {
    console.error("Error creating profile:", error);
    if (error instanceof Error && error.message.includes("Permissão insuficiente")) {
      return res.status(403).json({ message: error.message });
    }
    res.status(400).json({ message: "Dados de perfil inválidos" });
  }
});

router.patch("/profiles/:id", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const updatedProfile = await profileService.updateProfile(authContext, req.params.id, req.body);
    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Permissão insuficiente")) {
        return res.status(403).json({ message: error.message });
      }
    }
    res.status(400).json({ message: "Dados de perfil inválidos" });
  }
});

router.delete("/profiles/:id", async (req: AuthRequest, res: Response) => {
  try {
    const authContext = createAuthContextFromRequest(req);
    if (!authContext) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    await profileService.deleteProfile(authContext, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting profile:", error);
    if (error instanceof Error) {
      if (error.message.includes("não encontrado")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("Permissão insuficiente")) {
        return res.status(403).json({ message: error.message });
      }
    }
    res.status(400).json({ message: "Erro ao excluir perfil" });
  }
});

export default router;