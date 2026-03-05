import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import openapiTS, { COMMENT_HEADER, astToString } from "openapi-typescript";

const OPENAPI_URL =
  "https://raw.githubusercontent.com/hiero-ledger/hiero-mirror-node/main/rest/api/v1/openapi.yml";
const OUTPUT_PATH = path.resolve("src/mirror/generated/openapi.ts");

async function main(): Promise<void> {
  const ast = await openapiTS(OPENAPI_URL, {
    alphabetize: true,
    exportType: true,
    immutable: true
  });

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `/* eslint-disable */\n${COMMENT_HEADER}${astToString(ast)}\n`,
    "utf-8"
  );

  console.log(`Generated OpenAPI types at ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error("Failed to generate OpenAPI types", error);
  process.exit(1);
});
