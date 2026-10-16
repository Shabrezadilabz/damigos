import type { IncomingMessage, ServerResponse } from "node:http";

declare const handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
declare const config: { maxDuration: number };

export default handler;
export { config };
