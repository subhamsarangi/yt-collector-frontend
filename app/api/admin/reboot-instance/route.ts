import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSign } from "crypto";

const REGION      = process.env.OCI_REGION!;
const TENANCY     = process.env.OCI_TENANCY_ID!;
const USER        = process.env.OCI_API_USER!;
const FINGERPRINT = process.env.OCI_API_FINGERPRINT!;
const INSTANCE_ID = process.env.OCI_INSTANCE_ID!;
// Base64-encoded PEM private key stored in env
const PRIVATE_KEY = Buffer.from(process.env.OCI_PRIVATE_KEY_B64!, "base64").toString("utf-8");

/**
 * Sign an OCI REST request using RSA-SHA256 (OCI HTTP Signature v1).
 * https://docs.oracle.com/en-us/iaas/Content/API/Concepts/signingrequests.htm
 */
function signRequest(method: string, host: string, path: string, date: string, body: string) {
  const contentSha256 = Buffer.from(
    require("crypto").createHash("sha256").update(body).digest()
  ).toString("base64");
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
  const signature = sign.sign(PRIVATE_KEY, "base64");

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

  const host = `iaas.${REGION}.oraclecloud.com`;
  const path = `/20160918/instances/${encodeURIComponent(INSTANCE_ID)}`;
  const url  = `https://${host}${path}`;
  const body = JSON.stringify({ action: "SOFTRESET" });
  const date = new Date().toUTCString();

  const { authorization, contentSha256, contentLength } = signRequest("POST", host, path, date, body);

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
      error = `OCI returned ${res.status}: ${text}`;
      httpStatus = 500;
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
  });

  if (httpStatus !== 200) {
    return NextResponse.json({ error }, { status: httpStatus });
  }
  return NextResponse.json({ ok: true });
}
