export const SETTINGS_TABS = [
  { id: "profile", label: "Profile & theme", icon: "badge" },
  { id: "team", label: "Team", icon: "group" },
  { id: "payout", label: "Payout & POS", icon: "point_of_sale" },
  { id: "stickers", label: "Stickers", icon: "qr_code_2" },
  { id: "admin", label: "Admin", icon: "admin_panel_settings", badge: "Platform" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export function parseSettingsTab(raw: string | undefined): SettingsTabId {
  const ids = SETTINGS_TABS.map((t) => t.id);
  if (raw && ids.includes(raw as SettingsTabId)) return raw as SettingsTabId;
  return "stickers";
}
