export const SETTINGS_TABS = [
  { id: "profile", label: "Profile & theme", icon: "badge" },
  { id: "location", label: "Kitchen location", icon: "location_on" },
  { id: "team", label: "Team", icon: "group" },
  { id: "payout", label: "Banking & payout", icon: "account_balance" },
  { id: "stickers", label: "Stickers", icon: "qr_code_2" },
  { id: "admin", label: "Admin", icon: "admin_panel_settings", badge: "Platform" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(raw: string | undefined): SettingsTabId {
  const ids = SETTINGS_TABS.map((t) => t.id);
  if (raw && ids.includes(raw as SettingsTabId)) return raw as SettingsTabId;
  return "stickers";
}
