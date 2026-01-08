import type { NextApiRequest, NextApiResponse } from "next";
import { getLastEvent } from "@/lib/panelEventsStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const last = getLastEvent();
  return res.status(200).json(last ?? { event: null });
}
