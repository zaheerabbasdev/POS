import { prisma } from "../../config/prisma.js";

// API Spec Chapter 30 — "Business Settings: Shop Name, Address, Contact
// Number, Email, Logo, Currency, Time Zone." Setting (DDD Table 34) is a
// generic key-value store, so these are just the well-known keys this
// module reads/writes — shop_logo doubles as what the Uploads module
// (type: "logo") already upserts, so a logo set there shows up here too.
const KNOWN_KEYS = [
  "shop_name",
  "shop_address",
  "shop_phone",
  "shop_email",
  "shop_logo",
  "currency",
  "timezone",
] as const;

export type SettingKey = (typeof KNOWN_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  shop_name: "Mobile Shop POS",
  shop_address: "",
  shop_phone: "",
  shop_email: "",
  shop_logo: "",
  currency: "PKR",
  timezone: "Asia/Karachi",
};

/** GET /api/v1/settings (API Spec Chapter 30.1). */
export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany({ where: { settingKey: { in: [...KNOWN_KEYS] } } });
  const byKey = new Map(rows.map((r) => [r.settingKey, r.settingValue ?? ""]));

  return KNOWN_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: byKey.get(key) ?? DEFAULTS[key] }),
    {} as Record<SettingKey, string>,
  );
}

export type UpdateSettingsInput = Partial<Record<SettingKey, string>>;

/** PATCH /api/v1/settings (API Spec Chapter 30.2). */
export async function updateSettings(input: UpdateSettingsInput, updatedById: string): Promise<Record<SettingKey, string>> {
  const entries = Object.entries(input).filter(([key]) => (KNOWN_KEYS as readonly string[]).includes(key)) as [
    SettingKey,
    string,
  ][];

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { settingKey: key },
        update: { settingValue: value, updatedById },
        create: { settingKey: key, settingValue: value, updatedById },
      }),
    ),
  );

  return getSettings();
}
