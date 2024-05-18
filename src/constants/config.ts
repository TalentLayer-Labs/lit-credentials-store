import { env } from "@/env.mjs";

export const IS_USING_LIT_ACTION = true; // else = nextjs query
export const FIXED_PKP = env.NEXT_PUBLIC_LIT_PKP || null; // set your pkp here or leave blank to let the user generate one by himself
export const TEST_MODE = true;