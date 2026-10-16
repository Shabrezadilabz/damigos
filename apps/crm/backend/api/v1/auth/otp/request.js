export default function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ sent: true, channel: "sms_stub" }));
}

export const config = { maxDuration: 10 };
