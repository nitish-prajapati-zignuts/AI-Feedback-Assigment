import { sql } from "drizzle-orm";

/**
 * Converts a snake_case string to camelCase.
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Recursively converts keys of an object or array of objects from snake_case to camelCase.
 */
export function mapRowToCamelCase<T = any>(row: any): T {
  if (row === null || row === undefined) return row;
  
  if (Array.isArray(row)) {
    return row.map(mapRowToCamelCase) as any;
  }
  
  if (typeof row === "object" && row.constructor === Object) {
    const newRow: any = {};
    for (const key of Object.keys(row)) {
      const val = row[key];
      newRow[toCamelCase(key)] = typeof val === "object" ? mapRowToCamelCase(val) : val;
    }
    return newRow as T;
  }
  
  return row;
}

/**
 * Executes a database function/stored procedure and returns all resulting rows mapped to camelCase.
 * 
 * @param client The database connection/transaction client context.
 * @param procedureName The name of the PostgreSQL function/stored procedure.
 * @param params The arguments to pass to the function.
 * @returns An array of results mapped to camelCase.
 */
export async function executeStoredProcedureList<T = any>(
  client: any,
  procedureName: string,
  params: any[] = []
): Promise<T[]> {
  const query = sql`SELECT * FROM ${sql.raw(procedureName)}(${sql.join(
    params.map((p) => sql`${p}`),
    sql`, `
  )})`;
  
  const result = await client.execute(query);
  return mapRowToCamelCase<T[]>(result.rows);
}

/**
 * Executes a database function/stored procedure and returns the first resulting row mapped to camelCase, or null if empty.
 * 
 * @param client The database connection/transaction client context.
 * @param procedureName The name of the PostgreSQL function/stored procedure.
 * @param params The arguments to pass to the function.
 * @returns The first result mapped to camelCase, or null.
 */
export async function executeStoredProcedureSingle<T = any>(
  client: any,
  procedureName: string,
  params: any[] = []
): Promise<T | null> {
  const list = await executeStoredProcedureList<T>(client, procedureName, params);
  return list.length > 0 ? list[0] : null;
}

/**
 * Executes a database function/stored procedure for side-effects (where no return value is expected).
 * 
 * @param client The database connection/transaction client context.
 * @param procedureName The name of the PostgreSQL function/stored procedure.
 * @param params The arguments to pass to the function.
 */
export async function executeStoredProcedureVoid(
  client: any,
  procedureName: string,
  params: any[] = []
): Promise<void> {
  const query = sql`SELECT * FROM ${sql.raw(procedureName)}(${sql.join(
    params.map((p) => sql`${p}`),
    sql`, `
  )})`;
  
  await client.execute(query);
}
