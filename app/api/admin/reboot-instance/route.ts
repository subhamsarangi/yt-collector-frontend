import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSign, createHash, createPrivateKey } from "crypto";

const REGION      = (process.env.OCI_REGION ?? "").trim();
const TENANCY     = (process.env.OCI_TENANCY_ID ?? "").trim();
const USER        = (process.env.OCI_API_USER ?? "").trim();
const FINGERPRINT = (process.env.OCI_API_FINGERPRINT ?? "").trim();
const INSTANCE_ID = (process.env.OCI_INSTANCE_ID ?? "").trim();

function normalizePem(raw: string): string {
  // Handle keys stored with literal \n instead of real newlines,
  // or with spaces instead of newlines (common when pasting into .env)
  let pem = raw.trim();
  if (!pem.includes("\n")) {
    // Try replacing literal \n
    pem = pem.replace(/\\n/g, "\n");
  }
  if (!pem.includes("\n")) {
    // Try splitting on header/footer boundaries
    pem = pem
      .replace(/(-----BEGIN [^-]+-----)/, "$1\n")
      .replace(/(-----END [^-]+-----)/, "\n$1");
  }
  return pem;
}

function signRequest(method: string, host: string, path: string, date: string, body: string, privateKeyPem: string) {
  const contentSha256 = createHash("sha256").update(body).digest("base64");
  const contentLength = Buffer.byteLength(body).toString();

  const signingString = [
    `date: ${date}`,
    `(request-target): ${method.toLowerCase()} ${path}`,
    `host: ${host}`,
    `content-length: ${contentLength}`,
    `content-type: application/json`,
    `x-content-sha256: ${contentSha256}`,
  ].join("\n");

  console.log("[reboot] signing string:\n" + signingString);

  const keyObject = createPrivateKey({ key: privateKeyPem, format: "pem" });

  const sign = createSign("RSA-SHA256");
  sign.update(signingString);
  const signature = sign.sign(keyObject, "base64");

  const keyId = `${TENANCY}/${USER}/${FINGERPRINT}`;
  const headers = "date (request-target) host content-length content-type x-content-sha256";

  return {
    authorization: `Signature version="1",keyId="${keyId}",algorithm="rsa-sha256",headers="${headers}",signature="${signature}"`,
    contentSha256,
    contentLength,
  };
}

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  // Decode private key at request time — not module load time
  const privateKeyB64 = process.env.OCI_PRIVATE_KEY_B64;
  if (!privateKeyB64) return NextResponse.json({ error: "OCI_PRIVATE_KEY_B64 not configured" }, { status: 500 });
  const privateKey = normalizePem(Buffer.from(privateKeyB64, "base64").toString("utf-8"));

  const body_json = await req.json().catch(() => ({}));
  const action = body_json.action === "RESET" ? "reset" : "softreset";

  const host = `iaas.${REGION}.oraclecloud.com`;
  const path = `/20160918/instances/${encodeURIComponent(INSTANCE_ID)}/action`;
  const pathWithQuery = `${path}?action=${action}`;
  const url  = `https://${host}${pathWithQuery}`;
  // OCI instance action: action is a query param, body is empty
  const body = "";
  const date = new Date().toUTCString();
  console.log("[reboot] date header:", JSON.stringify(date));

  let authorization: string, contentSha256: string, contentLength: string;
  try {
    // OCI spec: (request-target) includes query string — use pathWithQuery
    ({ authorization, contentSha256, contentLength } = signRequest("POST", host, pathWithQuery, date, body, privateKey));
  } catch (e) {
    console.error("[reboot] signRequest failed:", e);
    console.error("[reboot] key length:", privateKey.length, "starts:", privateKey.slice(0, 40));
    return NextResponse.json({ error: `Key parse failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  let status = "success";
  let error: string | null = null;
  let httpStatus = 200;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "host": host,
        "x-content-sha256": contentSha256,
        "content-length": contentLength,
        "content-type": "application/json",
        "date": date,
        "Authorization": authorization,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      status = "failed";
      error = `OCI ${res.status}: ${text}`;
      console.error("[reboot] OCI error:", res.status, text);
      console.error("[reboot] signed url:", url);
      console.error("[reboot] key id:", `${TENANCY}/${USER}/${FINGERPRINT}`);
      httpStatus = 500;
    } else {
      console.log("[reboot] OCI accepted reboot, status:", res.status);
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
    httpStatus = 500;
    console.error("[reboot] fetch threw:", e);
    console.error("[reboot] url:", url);
    console.error("[reboot] region:", REGION, "instance:", INSTANCE_ID);
    console.error("[reboot] key decoded length:", privateKey.length);
    console.error("[reboot] key starts with:", privateKey.slice(0, 40));
  }

  // Log to reboot_logs (non-fatal — don't let this crash the response)
  try {
    await supabaseAdmin.from("reboot_logs").insert({
      instance_id: INSTANCE_ID,
      status,
      error,
      action,
    });
  } catch (logErr) {
    console.error("[reboot] Failed to write reboot_log:", logErr);
  }

  if (httpStatus !== 200) {
    return NextResponse.json({ error }, { status: httpStatus });
  }
  return NextResponse.json({ ok: true });
}
