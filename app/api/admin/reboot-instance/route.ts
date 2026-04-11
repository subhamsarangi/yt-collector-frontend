import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSign, createHash } from "crypto";

const REGION      = (process.env.OCI_REGION ?? "").trim();
const TENANCY     = (process.env.OCI_TENANCY_ID ?? "").trim();
const USER        = (process.env.OCI_API_USER ?? "").trim();
const FINGERPRINT = (process.env.OCI_API_FINGERPRINT ?? "").trim();
const INSTANCE_ID = (process.env.OCI_INSTANCE_ID ?? "").trim();

function signRequest(method: string, host: string, path: string, date: string, body: string, privateKey: string) {
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

  const sign = createSign("RSA-SHA256");
  sign.update(signingString);
  const signature = sign.sign(privateKey, "base64");

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
  const privateKey = Buffer.from(privateKeyB64, "base64").toString("utf-8");

  const body_json = await req.json().catch(() => ({}));
  const action = body_json.action === "RESET" ? "RESET" : "SOFTRESET";

  const host = `iaas.${REGION}.oraclecloud.com`;
  const path = `/20160918/instances/${encodeURIComponent(INSTANCE_ID)}`;
  const url  = `https://${host}${path}`;
  const body = JSON.stringify({ action });
  const date = new Date().toUTCString();

  const { authorization, contentSha256, contentLength } = signRequest("POST", host, path, date, body, privateKey);

  let status = "success";
  let error: string | null = null;
  let httpStatus = 200;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": contentLength,
        "x-content-sha256": contentSha256,
        "date": date,
        "Authorization": authorization,
      },
      body,
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
  }

  // Log to reboot_logs
  await supabaseAdmin.from("reboot_logs").insert({
    instance_id: INSTANCE_ID,
    status,
    error,
    action,
  });

  if (httpStatus !== 200) {
    return NextResponse.json({ error }, { status: httpStatus });
  }
  return NextResponse.json({ ok: true });
}
