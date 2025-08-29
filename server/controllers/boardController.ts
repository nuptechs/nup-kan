import type { Request, Response } from "express";
import { boardService, boardShareService } from "../services";
import { AuthServiceJWT } from "../microservices/authServiceJWT";

// Helper para criar AuthContext a partir da request
function createAuthContextFromRequest(req: any): any {
  const authContextJWT = req.authContext;
  if (authContextJWT) {
    return {
      userId: authContextJWT.userId,
      userName: authContextJWT.userName,
      userEmail: authContextJWT.userEmail,
      permissions: authContextJWT.permissions,
      permissionCategories: authContextJWT.permissionCategories,
      profileId: authContextJWT.profileId || '',
      profileName: authContextJWT.profileName,
      teams: authContextJWT.teams,
      sessionId: `jwt-${authContextJWT.userId}-${Date.now()}`,
      isAuthenticated: authContextJWT.isAuthenticated,
      lastActivity: authContextJWT.lastActivity
    };
  }
  
  // Fallback para session auth
  const userId = req.session?.user?.id || req.session?.userId;
  const user = req.user;
  const permissions = req.userPermissions || [];
  
  return {
    userId: userId,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || '',
    permissions: permissions.map((p: any) => p.name),
    permissionCategories: Array.from(new Set(permissions.map((p: any) => p.category))),
    profileId: user?.profileId || '',
    profileName: 'User',
    teams: [],
    sessionId: req.session?.id || 'no-session',
    isAuthenticated: !!userId,
    lastActivity: new Date()
  };
}

export class BoardController {
  static async getBoards(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const boards = await boardService.getBoards(authContext, { page, limit });
      
      // Paginação simples
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBoards = boards.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedBoards,
        pagination: {
          page,
          limit,
          total: boards.length,
          totalPages: Math.ceil(boards.length / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching boards:", error);
      res.status(500).json({ error: "Failed to fetch boards" });
    }
  }

  static async getBoard(req: Request, res: Response) {
    try {
      // Verificar JWT
      const authContext = await AuthServiceJWT.verifyAuth(req);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }
      
      const board = await boardService.getBoard(authContext, req.params.id);
      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }
      res.json(board);
    } catch (error) {
      console.error("Error fetching board:", error);
      res.status(500).json({ error: "Failed to fetch board" });
    }
  }

  static async createBoard(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const board = await boardService.createBoard(authContext, req.body);
      res.status(201).json(board);
    } catch (error) {
      console.error("Board creation error:", error);
      res.status(400).json({ error: "Failed to create board" });
    }
  }

  static async updateBoard(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedBoard = await boardService.updateBoard(authContext, req.params.id, req.body);
      
      res.json(updatedBoard);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(400).json({ message: "Invalid board data" });
    }
  }

  static async deleteBoard(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      await boardService.deleteBoard(authContext, req.params.id);
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board not found" });
      }
      res.status(500).json({ message: "Failed to delete board" });
    }
  }

  static async toggleBoardStatus(req: Request, res: Response) {
    try {
      const boardId = req.params.id;
      
      const authContext = createAuthContextFromRequest(req);
      const updatedBoard = await boardService.toggleBoardStatus(authContext, boardId);
      
      res.json(updatedBoard);
    } catch (error) {
      console.error("Error toggling board status:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  static async getBoardShares(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getBoardShares(authContext, req.params.boardId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  }

  static async getBoardMembers(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const members = await boardShareService.getBoardMembers(authContext, req.params.boardId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching board members:", error);
      res.status(500).json({ message: "Failed to fetch board members" });
    }
  }

  static async getBoardMemberCount(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const count = await boardShareService.getBoardMemberCount(authContext, req.params.boardId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching board member count:", error);
      res.status(500).json({ message: "Failed to fetch board member count" });
    }
  }

  static async getAllBoardShares(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getAllBoardShares(authContext);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch board shares" });
    }
  }

  static async getUserSharedBoards(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getUserSharedBoards(authContext, req.params.userId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user shared boards" });
    }
  }

  static async getTeamSharedBoards(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const shares = await boardShareService.getTeamSharedBoards(authContext, req.params.teamId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team shared boards" });
    }
  }

  static async createBoardShare(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const share = await boardShareService.createBoardShare(authContext, req.body);
      res.status(201).json(share);
    } catch (error) {
      res.status(400).json({ message: "Failed to create board share" });
    }
  }

  static async updateBoardShare(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedShare = await boardShareService.updateBoardShare(authContext, req.params.id, req.body);
      res.json(updatedShare);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board share not found" });
      }
      res.status(400).json({ message: "Failed to update board share" });
    }
  }

  static async deleteBoardShare(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      await boardShareService.deleteBoardShare(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Board share not found" });
      }
      res.status(500).json({ message: "Failed to delete board share" });
    }
  }

  static async getUserBoardPermission(req: Request, res: Response) {
    try {
      const authContext = createAuthContextFromRequest(req);
      const permission = await boardShareService.getUserBoardPermission(authContext, req.params.userId, req.params.boardId);
      res.json({ permission });
    } catch (error) {
      res.status(500).json({ message: "Failed to check user board permission" });
    }
  }
}