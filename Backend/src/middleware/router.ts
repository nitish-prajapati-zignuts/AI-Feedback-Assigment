import { Request, Response, NextFunction } from "express";
import { container } from "../di";
import { authenticateToken } from "./auth";
import { AuthenticatedRequest } from "./auth";

interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pathPattern: RegExp;
  paramNames: string[];
  controllerName: string;
  actionName: string;
  authenticate: boolean;
}

const routes: RouteDefinition[] = [
  // Auth
  { method: "POST", pathPattern: /^\/api\/auth\/register$/, paramNames: [], controllerName: "authController", actionName: "registerUser", authenticate: false },
  { method: "POST", pathPattern: /^\/api\/auth\/login$/, paramNames: [], controllerName: "authController", actionName: "loginUser", authenticate: false },
  { method: "POST", pathPattern: /^\/api\/auth\/logout$/, paramNames: [], controllerName: "authController", actionName: "logoutUser", authenticate: false },
  { method: "GET", pathPattern: /^\/api\/auth\/me$/, paramNames: [], controllerName: "authController", actionName: "getUserProfile", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/auth\/users$/, paramNames: [], controllerName: "authController", actionName: "getAllUsers", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/auth\/plan$/, paramNames: [], controllerName: "authController", actionName: "updateUserPlan", authenticate: true },

  // Feedback CRUD
  { method: "POST", pathPattern: /^\/api\/feedback$/, paramNames: [], controllerName: "feedbackController", actionName: "createFeedback", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback$/, paramNames: [], controllerName: "feedbackController", actionName: "getFeedbackList", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "getFeedbackDetails", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "updateFeedback", authenticate: true },
  { method: "DELETE", pathPattern: /^\/api\/feedback\/([^\/]+)$/, paramNames: ["id"], controllerName: "feedbackController", actionName: "deleteFeedback", authenticate: true },

  // Notes
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/notes$/, paramNames: ["feedbackId"], controllerName: "noteController", actionName: "createNote", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)\/notes$/, paramNames: ["feedbackId"], controllerName: "noteController", actionName: "getNotes", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/feedback\/notes\/([^\/]+)$/, paramNames: ["id"], controllerName: "noteController", actionName: "updateNote", authenticate: true },
  { method: "DELETE", pathPattern: /^\/api\/feedback\/notes\/([^\/]+)$/, paramNames: ["id"], controllerName: "noteController", actionName: "deleteNote", authenticate: true },

  // Action Items
  { method: "GET", pathPattern: /^\/api\/actions$/, paramNames: [], controllerName: "actionController", actionName: "getAllActionItems", authenticate: true },
  { method: "GET", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "getActionItems", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "createActionItem", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions\/approve$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "approveActionItemSuggestion", authenticate: true },
  { method: "POST", pathPattern: /^\/api\/feedback\/([^\/]+)\/actions\/reject$/, paramNames: ["feedbackId"], controllerName: "actionController", actionName: "rejectActionItemSuggestion", authenticate: true },
  { method: "PUT", pathPattern: /^\/api\/actions\/([^\/]+)$/, paramNames: ["id"], controllerName: "actionController", actionName: "updateActionItem", authenticate: true },
  { method: "DELETE", pathPattern: /^\/api\/actions\/([^\/]+)$/, paramNames: ["id"], controllerName: "actionController", actionName: "deleteActionItem", authenticate: true },

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
          authenticateToken(req as AuthenticatedRequest, res, async () => {
            await executeControllerAction(route, req, res);
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
