/** Minimal ESC/POS encoder for 58/80mm kitchen tickets. */

const ESC = 0x1b;
const GS = 0x1d;

function textEncoder() {
  return new TextEncoder(); // UTF-8; many clones accept ASCII-heavy tickets fine
}

function concat(...parts: Uint8Array[]) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function cmd(...bytes: number[]) {
  return new Uint8Array(bytes);
}

function line(s: string) {
  return concat(textEncoder().encode(s), cmd(0x0a));
}

function align(mode: 0 | 1 | 2) {
  return cmd(ESC, 0x61, mode); // 0 left, 1 center, 2 right
}

function bold(on: boolean) {
  return cmd(ESC, 0x45, on ? 1 : 0);
}

function doubleSize(on: boolean) {
  return cmd(GS, 0x21, on ? 0x11 : 0x00);
}

function cut() {
  return cmd(GS, 0x56, 0x00);
}

function init() {
  return cmd(ESC, 0x40);
}

function hr(widthChars: number) {
  return line("-".repeat(Math.max(16, Math.min(48, widthChars))));
}

export type KotTicketInput = {
  restaurantName: string;
  orderId: string;
  createdAt: string;
  prepMinutes?: number | null;
  customerPhoneLast4?: string | null;
  channel?: string;
  pickupCode?: string | null;
  awb?: string | null;
  items: { name: string; quantity: number; unitPricePaise?: number }[];
  totalPaise?: number;
  notes?: string | null;
  paperMm?: 58 | 80;
};

export function encodeKotEscPos(ticket: KotTicketInput): Uint8Array {
  const cols = ticket.paperMm === 58 ? 32 : 42;
  const shortId = ticket.orderId.slice(0, 8).toUpperCase();
  const time = new Date(ticket.createdAt).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  const channel = ticket.channel ?? "WhatsApp";

  const chunks: Uint8Array[] = [
    init(),
    align(1),
    bold(true),
    doubleSize(true),
    line("KOT"),
    doubleSize(false),
    line(ticket.restaurantName.slice(0, cols)),
    bold(false),
    hr(cols),
    align(0),
    bold(true),
    line(`#${shortId}`),
    bold(false),
    line(`${channel}  ·  ${time}`),
  ];

  if (ticket.prepMinutes) {
    chunks.push(line(`Prep SLA: ${ticket.prepMinutes} min`));
  }
  if (ticket.customerPhoneLast4) {
    chunks.push(line(`Guest ••••${ticket.customerPhoneLast4}`));
  }
  if (ticket.pickupCode) {
    chunks.push(bold(true), line(`PICKUP CODE: ${ticket.pickupCode}`), bold(false));
  }
  if (ticket.awb) {
    chunks.push(line(`AWB: ${ticket.awb}`.slice(0, cols)));
  }

  chunks.push(hr(cols), bold(true), line("ITEMS"), bold(false));

  for (const item of ticket.items) {
    const qtyName = `${item.quantity}x ${item.name}`.slice(0, cols);
    chunks.push(line(qtyName));
  }

  if (ticket.notes?.trim()) {
    chunks.push(hr(cols), line(`Note: ${ticket.notes.trim().slice(0, cols * 2)}`));
  }

  if (ticket.totalPaise != null) {
    chunks.push(
      hr(cols),
      bold(true),
      line(`TOTAL  Rs ${(ticket.totalPaise / 100).toFixed(2)}`),
      bold(false),
    );
  }

  chunks.push(hr(cols), align(1), line("D'aMigo's Kitchen"), line(" "), line(" "), cut());

  return concat(...chunks);
}

export function encodeTestPage(paperMm: 58 | 80 = 80): Uint8Array {
  return encodeKotEscPos({
    restaurantName: "D'aMigo's CRM",
    orderId: "TESTPRINT0001",
    createdAt: new Date().toISOString(),
    prepMinutes: 15,
    customerPhoneLast4: "0000",
    channel: "Test print",
    items: [
      { name: "Sample Paneer Tikka", quantity: 1 },
      { name: "Butter Naan", quantity: 2 },
    ],
    totalPaise: 34900,
    paperMm,
  });
}
