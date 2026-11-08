import { NextRequest } from "next/server";
import { POST as widgetChatPOST } from "@/app/api/v1/widget/chat/route";

/**
 * Legacy Chat Endpoint Alias
 * Forwards requests seamlessly to the unified `/api/v1/widget/chat` route handler.
 */
export async function POST(req: NextRequest) {
  return widgetChatPOST(req);
}
