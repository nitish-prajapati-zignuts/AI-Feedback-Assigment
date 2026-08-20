import { Response } from "express";

export class BaseController {
  /**
   * Sends a 200 OK JSON response.
   */
  protected ok<T>(res: Response, data: T): void {
    res.status(200).json(data);
  }

  /**
   * Sends a 201 Created JSON response.
   */
  protected created<T>(res: Response, data: T): void {
    res.status(201).json(data);
  }

  /**
   * Sends a 400 Bad Request JSON response.
   */
  protected badRequest(res: Response, message: string): void {
    res.status(400).json({ error: message });
  }

  /**
   * Sends a 403 Forbidden JSON response.
   */
  protected forbidden(res: Response, message: string = "Access denied"): void {
    res.status(403).json({ error: message });
  }

  /**
   * Sends a 404 Not Found JSON response.
   */
  protected notFound(res: Response, message: string = "Resource not found"): void {
    res.status(404).json({ error: message });
  }

  /**
   * Sends a 500 Internal Server Error JSON response from the .
   */
  protected serverError(res: Response, error: any, contextMessage: string = "Internal server error"): void {
    console.error(contextMessage, error);
    res.status(500).json({ error: "Internal server error" });
  }
}
