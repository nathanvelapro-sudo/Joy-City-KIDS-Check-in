import { normalizeUsPhoneToE164 } from "@/lib/utils";

export async function sendSmsWithTwilio(params: {
  to: string;
  message: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio environment variables are not configured.");
  }

  const normalizedTo = normalizeUsPhoneToE164(params.to);
  const normalizedFrom = normalizeUsPhoneToE164(from) ?? from;

  if (!normalizedTo) {
    throw new Error("The family phone number is not in a valid SMS format.");
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    To: normalizedTo,
    From: normalizedFrom,
    Body: params.message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const data = (await response.json()) as { sid?: string; message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Failed to send SMS.");
  }

  return data;
}
