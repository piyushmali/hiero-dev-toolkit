/* eslint-disable */
/**
 * Placeholder generated output.
 * Run `npm run generate:openapi` to regenerate full types from the official spec.
 */

export interface paths {
  "/api/v1/accounts/{id}": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              account: string;
              balance?: {
                balance: number;
                timestamp: string;
              };
            };
          };
        };
      };
    };
  };
  "/api/v1/transactions": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              transactions: Array<{
                transaction_id: string;
                consensus_timestamp?: string;
              }>;
              links: {
                next: string | null;
              };
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: Record<string, unknown>;
}
