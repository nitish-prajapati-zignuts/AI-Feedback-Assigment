import { Request, Response, NextFunction } from "express";
import { container } from "../di";
import { authenticateToken } from "./auth";
import { authenticateWorkspace, requireRole, Role, WorkspaceRequest } from "./rbac";

interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pathPattern: RegExp;
  paramNames: string[];
  controllerName: string;
  actionName: string;
  authenticate: boolean;
  requiredRoles?: Role[];
}

const routes: RouteDefinition[] = [
  // Auth
  { method: "POST", pathPattern: /^\/api\/auth\/register$/, paramNames: [], controllerName: "authController", actionName: "registerUser", authenticate: false },
  { method: "POST", pathPattern: /^\/api\/auth\/login$/, paramNames: [], controllerName: "authController", actionName: "loginUser", authenticate: false },
  { method: "POST", pathPattern: /^\/api\/auth\/logout$/, paramNames: [], controllerName: "authController", actionName: "logoutUser", authenticate: false },
  { method: "GET", pathPattern: /^\/api\/auth\/me$/, paramNames: [], controllerName: "authController", actionName: "getUserProfile", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/auth\/users$/, paramNames: [], controllerName: "authController", actionName: "getAllUsers", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/auth\/plan$/, paramNames: [], controllerName: "authController", actionName: "updateUserPlan", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/auth\/profile$/, paramNames: [], controllerName: "authController", actionName: "updateProfile", authenticate: true },
  { method: "DELETE", pathPattern: /^\/api\/auth\/account$/, paramNames: [], controllerName: "authController", actionName: "deleteAccount", authenticate: true },

  // Workspaces & Members
  { method: "GET", pathPattern: /^\/api\/workspaces$/, paramNames: [], controllerName: "workspaceController", actionName: "getUserWorkspaces", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/workspaces$/, paramNames: [], controllerName: "workspaceController", actionName: "createWorkspace", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/workspaces\/([^\/]+)\/members$/, paramNames: ["workspaceId"], controllerName: "workspaceController", actionName: "getMembers", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/workspaces\/([^\/]+)\/invites$/, paramNames: ["workspaceId"], controllerName: "workspaceController", actionName: "createInvite", authenticate: true, requiredRoles: ["owner", "admin"] },
  { method: "GET", pathPattern: /^\/api\/workspaces\/invites\/([^\/]+)$/, paramNames: ["token"], controllerName: "workspaceController", actionName: "getInviteByToken", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/workspaces\/invites\/accept$/, paramNames: [], controllerName: "workspaceController", actionName: "acceptInvite", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/workspaces\/([^\/]+)\/members\/([^\/]+)$/, paramNames: ["workspaceId", "memberId"], controllerName: "workspaceController", actionName: "updateMemberRole", authenticate: true, requiredRoles: ["owner", "admin"] },
  { method: "DELETE", pathPattern: /^\/api\/workspaces\/([^\/]+)\/members\/([^\/]+)$/, paramNames: ["workspaceId", "memberId"], controllerName: "workspaceController", actionName: "removeMember", authenticate: true, requiredRoles: ["owner", "admin"] },

  // Feedback CRUD
  { method: "POST", pathPattern: /^\/api\/feedback$/, paramNames: [], controllerName: "feedbackController", actionName: "createFeedback", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "GET", pathPattern: /^\/api\/feedback$/, paramNames: [], controllerName: "feedbackController", actionName: "getFeedbackList", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "getFeedbackDetails", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "updateFeedback", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "DELETE", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "deleteFeedback", authenticate: true, requiredRoles: ["owner", "admin"] },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/draft-reply$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "generateReplyDraft", authenticate: true },

  // Notes
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/notes$/, paramNames: ["feedbackId"], controllerName: "noteController", actionName: "createNote", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)\/notes$/, paramNames: ["feedbackId"], controllerName: "noteController", actionName: "getNotes", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/feedback\/notes\/([^\/]+)$/, paramNames: ["id"], controllerName: "noteController", actionName: "updateNote", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "DELETE", pathPattern: /^\/api\/feedback\/notes\/([^\/]+)$/, paramNames: ["id"], controllerName: "noteController", actionName: "deleteNote", authenticate: true, requiredRoles: ["owner", "admin"] },

  // Action Items
  { method: "GET", pathPattern: /^\/api\/actions$/, paramNames: [], controllerName: "actionController", actionName: "getAllActionItems", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "getActionItems", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "createActionItem", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions\/approve$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "approveActionItemSuggestion", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions\/reject$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "rejectActionItemSuggestion", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "PUT", pathPattern: /^\/api\/actions\/([^\/]+)$/, paramNames: ["id"], controllerName: "actionController", actionName: "updateActionItem", authenticate: true, requiredRoles: ["owner", "admin", "editor"] },
  { method: "DELETE", pathPattern: /^\/api\/actions\/([^\/]+)$/, paramNames: ["id"], controllerName: "actionController", actionName: "deleteActionItem", authenticate: true, requiredRoles: ["owner", "admin"] },

  // API Keys
  { method: "GET", pathPattern: /^\/api\/keys$/, paramNames: [], controllerName: "apiKeyController", actionName: "getWorkspaceKeys", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/keys$/, paramNames: [], controllerName: "apiKeyController", actionName: "createKey", authenticate: true, requiredRoles: ["owner", "admin"] },
  { method: "DELETE", pathPattern: /^\/api\/keys\/([^\/]+)$/, paramNames: ["id"], controllerName: "apiKeyController", actionName: "deleteKey", authenticate: true, requiredRoles: ["owner", "admin"] },

  // Public Widget Submission
  { method: "POST", pathPattern: /^\/api\/widget\/submit$/, paramNames: [], controllerName: "apiKeyController", actionName: "submitWidgetFeedback", authenticate: false },

  // Analytics & Trends
  { method: "GET", pathPattern: /^\/api\/analytics\/trends$/, paramNames: [], controllerName: "analyticsController", actionName: "getTrends", authenticate: true },

  // Payments
  { method: "POST", pathPattern: /^\/api\/payment\/order$/, paramNames: [], controllerName: "paymentController", actionName: "createOrder", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/payment\/verify$/, paramNames: [], controllerName: "paymentController", actionName: "verifyPayment", authenticate: true },
];

export const routingMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const method = req.method;
  const path = req.path;

  for (const route of routes) {
    if (route.method === method) {
      const match = path.match(route.pathPattern);
      if (match) {
        // Extract URL params and set them on req.params
        const params: { [key: string]: string } = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        req.params = params;

        // Perform authentication if required
        if (route.authenticate) {
          authenticateToken(req as WorkspaceRequest, res, async () => {
            await authenticateWorkspace(req as WorkspaceRequest, res, async () => {
              if (route.requiredRoles && route.requiredRoles.length > 0) {
                requireRole(route.requiredRoles)(req as WorkspaceRequest, res, async () => {
                  await executeControllerAction(route, req, res);
                });
              } else {
                await executeControllerAction(route, req, res);
              }
            });
          });
        } else {
          await executeControllerAction(route, req, res);
        }
        return;
      }
    }
  }

  // Fall through
  next();
};

async function executeControllerAction(route: RouteDefinition, req: Request, res: Response): Promise<void> {
  try {
    const controller = container.resolve<any>(route.controllerName);
    const action = controller[route.actionName];
    if (typeof action !== "function") {
      res.status(500).json({ error: `Action ${route.actionName} not found on controller ${route.controllerName}` });
      return;
    }
    await action(req, res);
  } catch (err) {
    console.error(`Error dispatching route ${route.method} ${req.path}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
}
