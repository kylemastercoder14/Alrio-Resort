export type RuntimeSettingKey =
  | "APP_URL"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_SECURE"
  | "SMTP_USER"
  | "SMTP_PASSWORD"
  | "SMTP_FROM"
  | "SMTP_REPLY_TO"
  | "CRON_SECRET"
  | "PAYMONGO_SECRET_KEY"
  | "PAYMONGO_PUBLIC_KEY"
  | "PAYMONGO_WEBHOOK_SECRET"
  | "META_APP_ID"
  | "META_APP_SECRET"
  | "META_PAGE_ID"
  | "META_PAGE_ACCESS_TOKEN"
  | "META_VERIFY_TOKEN"
  | "META_GRAPH_API_VERSION"
  | "META_MESSENGER_WEBHOOK_URL"
  | "DISCORD_CLIENT_ID"
  | "DISCORD_CLIENT_SECRET";

export type RuntimeSettingDefinition = {
  key: RuntimeSettingKey;
  label: string;
  category:
    | "Application"
    | "Email"
    | "Payments"
    | "Messaging"
    | "Operations"
    | "Optional integrations";
  fallbackEnv: string;
  secret?: boolean;
  description?: string;
};

export const RUNTIME_SETTING_DEFINITIONS: readonly RuntimeSettingDefinition[] = [
  { key: "APP_URL", label: "Public application URL", category: "Application", fallbackEnv: "NEXT_PUBLIC_APP_URL", description: "Used for payment return links and transactional email links." },
  { key: "SMTP_HOST", label: "SMTP host", category: "Email", fallbackEnv: "SMTP_HOST" },
  { key: "SMTP_PORT", label: "SMTP port", category: "Email", fallbackEnv: "SMTP_PORT" },
  { key: "SMTP_SECURE", label: "SMTP uses TLS", category: "Email", fallbackEnv: "SMTP_SECURE", description: "Use true for implicit TLS, otherwise false for STARTTLS." },
  { key: "SMTP_USER", label: "SMTP username", category: "Email", fallbackEnv: "SMTP_USER" },
  { key: "SMTP_PASSWORD", label: "SMTP password", category: "Email", fallbackEnv: "SMTP_PASSWORD", secret: true },
  { key: "SMTP_FROM", label: "SMTP from address", category: "Email", fallbackEnv: "SMTP_FROM" },
  { key: "SMTP_REPLY_TO", label: "SMTP reply-to address", category: "Email", fallbackEnv: "SMTP_REPLY_TO" },
  { key: "PAYMONGO_SECRET_KEY", label: "PayMongo secret key", category: "Payments", fallbackEnv: "PAYMONGO_SECRET_KEY", secret: true },
  { key: "PAYMONGO_PUBLIC_KEY", label: "PayMongo public key", category: "Payments", fallbackEnv: "PAYMONGO_PUBLIC_KEY" },
  { key: "PAYMONGO_WEBHOOK_SECRET", label: "PayMongo webhook secret", category: "Payments", fallbackEnv: "PAYMONGO_WEBHOOK_SECRET", secret: true },
  { key: "META_APP_ID", label: "Meta app ID", category: "Messaging", fallbackEnv: "META_APP_ID" },
  { key: "META_APP_SECRET", label: "Meta app secret", category: "Messaging", fallbackEnv: "META_APP_SECRET", secret: true },
  { key: "META_PAGE_ID", label: "Meta page ID", category: "Messaging", fallbackEnv: "META_PAGE_ID" },
  { key: "META_PAGE_ACCESS_TOKEN", label: "Meta page access token", category: "Messaging", fallbackEnv: "META_PAGE_ACCESS_TOKEN", secret: true },
  { key: "META_VERIFY_TOKEN", label: "Meta verify token", category: "Messaging", fallbackEnv: "META_VERIFY_TOKEN", secret: true },
  { key: "META_GRAPH_API_VERSION", label: "Meta Graph API version", category: "Messaging", fallbackEnv: "META_GRAPH_API_VERSION" },
  { key: "META_MESSENGER_WEBHOOK_URL", label: "Messenger webhook URL", category: "Messaging", fallbackEnv: "META_MESSENGER_WEBHOOK_URL" },
  { key: "CRON_SECRET", label: "Invoice cron secret", category: "Operations", fallbackEnv: "CRON_SECRET", secret: true },
  { key: "DISCORD_CLIENT_ID", label: "Discord client ID", category: "Optional integrations", fallbackEnv: "DISCORD_CLIENT_ID", description: "Reserved for a future Discord integration." },
  { key: "DISCORD_CLIENT_SECRET", label: "Discord client secret", category: "Optional integrations", fallbackEnv: "DISCORD_CLIENT_SECRET", secret: true, description: "Reserved for a future Discord integration." },
] as const;

export const BOOTSTRAP_ENVIRONMENT_SETTINGS = [
  { label: "Database connection", env: "DATABASE_URL", reason: "Prisma needs this before it can reach database-stored settings." },
  { label: "Shadow database connection", env: "SHADOW_DATABASE_URL", reason: "Used only by Prisma development migrations." },
  { label: "Configuration encryption key", env: "CONFIG_ENCRYPTION_KEY", reason: "Recommended stable key for encrypting saved settings; otherwise the Better Auth secret is used." },
  { label: "Better Auth secret and URL", env: "BETTER_AUTH_SECRET / BETTER_AUTH_URL", reason: "Authentication is initialized before database runtime settings can load." },
  { label: "Google and Apple OAuth", env: "GOOGLE_* / APPLE_*", reason: "OAuth providers are initialized during application startup." },
  { label: "UploadThing token", env: "UPLOADTHING_TOKEN", reason: "UploadThing initializes its upload route at startup." },
] as const;
