import { z } from "zod";

const linksSchema = z.object({
  next: z.string().nullable()
});

const tokenBalanceSchema = z.object({
  token_id: z.string(),
  balance: z.number(),
  decimals: z.number().optional(),
  kyc_status: z.string().optional()
});

const accountSchema = z.object({
  account: z.string(),
  alias: z.string().nullable().optional(),
  auto_renew_period: z.number().nullable().optional(),
  balance: z
    .object({
      balance: z.number(),
      timestamp: z.string(),
      tokens: z.array(tokenBalanceSchema).optional()
    })
    .optional(),
  created_timestamp: z.string().optional(),
  decline_reward: z.boolean().optional(),
  deleted: z.boolean().optional(),
  ethereum_nonce: z.number().nullable().optional(),
  evm_address: z.string().nullable().optional(),
  key: z
    .object({
      key: z.string()
    })
    .nullable()
    .optional(),
  memo: z.string().nullable().optional()
});

const transactionSchema = z.object({
  transaction_id: z.string(),
  consensus_timestamp: z.string().optional(),
  name: z.string().optional(),
  result: z.string().optional(),
  charged_tx_fee: z.number().optional(),
  entity_id: z.string().nullable().optional(),
  memo_base64: z.string().optional(),
  transfers: z
    .array(
      z.object({
        account: z.string(),
        amount: z.number(),
        is_approval: z.boolean().optional()
      })
    )
    .optional()
});

export const accountListSchema = z.object({
  accounts: z.array(accountSchema),
  links: linksSchema
});

export const accountSchemaStrict = accountSchema;

export const tokenBalancesSchema = z.object({
  tokens: z.array(tokenBalanceSchema),
  links: linksSchema
});

export const transactionsSchema = z.object({
  transactions: z.array(transactionSchema),
  links: linksSchema
});

export const balanceSnapshotSchema = z.object({
  balances: z.array(
    z.object({
      account: z.string(),
      balance: z.number(),
      tokens: z.array(tokenBalanceSchema).optional()
    })
  ),
  timestamp: z.string().optional(),
  links: linksSchema
});

export const nftInfoSchema = z.object({
  account_id: z.string().optional(),
  metadata: z.string().optional(),
  serial_number: z.number().optional(),
  token_id: z.string().optional(),
  spender: z.string().nullable().optional(),
  deleted: z.boolean().optional(),
  modified_timestamp: z.string().optional()
});

export const scheduleSchema = z.object({
  schedule_id: z.string(),
  creator_account_id: z.string().optional(),
  payer_account_id: z.string().optional(),
  admin_key: z
    .object({
      key: z.string()
    })
    .nullable()
    .optional(),
  memo: z.string().optional(),
  deleted: z.boolean().optional(),
  expiration_time: z.string().optional(),
  executed_timestamp: z.string().nullable().optional(),
  transaction_id: z.string().optional(),
  signers: z.array(z.object({ key: z.string() })).optional()
});

export const topicMessagesSchema = z.object({
  messages: z.array(
    z.object({
      consensus_timestamp: z.string(),
      message: z.string(),
      running_hash: z.string(),
      sequence_number: z.number(),
      topic_id: z.string()
    })
  ),
  links: linksSchema
});
