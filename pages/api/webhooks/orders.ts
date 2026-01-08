import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { setLastEvent } from "@/lib/panelEventsStore";

export const config = {
  api: {
    bodyParser: false,
  },
};

const readRawBody = (req: NextApiRequest): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const verifySignature = (raw: Buffer, signatureHeader: string | undefined, secret: string) => {
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const provided = signatureHeader.replace("v1=", "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.PASTITA_WEBHOOK_SECRET || "";
  const rawBody = await readRawBody(req);
  const signature = req.headers["x-pastita-signature"] as string | undefined;

  if (!verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (!payload?.event) {
    return res.status(400).json({ error: "Missing event" });
  }

  setLastEvent({
    event: payload.event,
    data: payload.data || {},
    received_at: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}
