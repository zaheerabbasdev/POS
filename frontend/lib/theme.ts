import { createTheme, type MantineThemeOverride } from "@mantine/core";

/**
 * Central Mantine theme for Mobile Shop POS.
 *
 * Design principles:
 * - Indigo as the primary brand color — professional SaaS blue-violet
 * - Inter typeface — clean, highly legible for business dashboards
 * - Moderate border radius — neither boxy nor excessively rounded
 * - Subtle shadows — feels solid, not flat or floating
 * - Consistent component sizing throughout the application
 */
export const theme: MantineThemeOverride = createTheme({
  // ─── Typography ───────────────────────────────────────────────────────────
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
  headings: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "1.75rem", lineHeight: "1.3" },
      h2: { fontSize: "1.375rem", lineHeight: "1.35" },
      h3: { fontSize: "1.125rem", lineHeight: "1.4" },
      h4: { fontSize: "1rem",     lineHeight: "1.4" },
    },
  },

  // ─── Color System ─────────────────────────────────────────────────────────
  primaryColor: "indigo",
  primaryShade: { light: 6, dark: 5 },
  colors: {
    // Semantic color for success states
    success: [
      "#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac",
      "#4ade80", "#22c55e", "#16a34a", "#15803d",
      "#166534", "#14532d",
    ],
  },

  // ─── Shape ────────────────────────────────────────────────────────────────
  defaultRadius: "sm",
  radius: {
    xs: "2px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },

  // ─── Shadows ──────────────────────────────────────────────────────────────
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },

  // ─── Spacing ──────────────────────────────────────────────────────────────
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.25rem",
    xl: "1.5rem",
  },

  // ─── Breakpoints ──────────────────────────────────────────────────────────
  breakpoints: {
    xs: "30em",
    sm: "48em",
    md: "64em",
    lg: "80em",
    xl: "90em",
  },

  // ─── Component Defaults ───────────────────────────────────────────────────
  components: {
    Button: {
      defaultProps: {
        radius: "sm",
      },
      styles: {
        root: {
          fontWeight: 500,
          letterSpacing: "0.01em",
        },
      },
    },

    TextInput: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    PasswordInput: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    NumberInput: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    Textarea: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    Select: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    MultiSelect: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    DateInput: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    DatePickerInput: {
      defaultProps: {
        radius: "sm",
        size: "sm",
      },
    },

    Modal: {
      defaultProps: {
        radius: "md",
        shadow: "md",
        overlayProps: { backgroundOpacity: 0.4, blur: 2 },
        transitionProps: { transition: "fade", duration: 150 },
      },
      styles: {
        header: {
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          paddingBottom: "0.75rem",
          marginBottom: "0",
        },
        body: {
          paddingTop: "1rem",
        },
        title: {
          fontWeight: 600,
          fontSize: "1rem",
        },
      },
    },

    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "xs",
      },
    },

    Card: {
      defaultProps: {
        radius: "md",
        shadow: "xs",
      },
    },

    Badge: {
      defaultProps: {
        radius: "sm",
      },
    },

    Notification: {
      defaultProps: {
        radius: "sm",
      },
    },

    Table: {
      defaultProps: {
        striped: false,
        highlightOnHover: true,
        withTableBorder: false,
        withColumnBorders: false,
      },
      styles: {
        thead: {
          backgroundColor: "var(--mantine-color-gray-0)",
        },
        th: {
          fontWeight: 600,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--mantine-color-gray-6)",
          paddingTop: "0.625rem",
          paddingBottom: "0.625rem",
        },
        td: {
          fontSize: "0.875rem",
          paddingTop: "0.75rem",
          paddingBottom: "0.75rem",
          verticalAlign: "middle",
        },
        tr: {
          borderBottom: "1px solid var(--mantine-color-gray-1)",
        },
      },
    },

    Tabs: {
      defaultProps: {
        radius: "sm",
      },
    },

    NavLink: {
      styles: {
        root: {
          borderRadius: "6px",
          fontWeight: 500,
        },
        label: {
          fontSize: "0.875rem",
        },
      },
    },

    ActionIcon: {
      defaultProps: {
        variant: "subtle",
        radius: "sm",
      },
    },

    Menu: {
      defaultProps: {
        shadow: "sm",
        radius: "sm",
      },
    },

    Tooltip: {
      defaultProps: {
        withArrow: true,
        arrowSize: 6,
        transitionProps: { transition: "fade", duration: 100 },
      },
    },

    Skeleton: {
      defaultProps: {
        radius: "sm",
        animate: true,
      },
    },
  },
});

// ─── Status Badge Color Maps ─────────────────────────────────────────────────
// Used by the StatusBadge component to map backend enum values to Mantine colors.

export const SALE_STATUS_COLORS: Record<string, string> = {
  PAID:      "green",
  PARTIAL:   "yellow",
  UNPAID:    "red",
  CANCELLED: "gray",
};

export const PURCHASE_STATUS_COLORS: Record<string, string> = {
  PAID:    "green",
  PARTIAL: "yellow",
  PENDING: "orange",
};

export const REPAIR_STATUS_COLORS: Record<string, string> = {
  RECEIVED:             "blue",
  UNDER_INSPECTION:     "indigo",
  WAITING_FOR_PARTS:    "orange",
  IN_PROGRESS:          "yellow",
  READY_FOR_DELIVERY:   "teal",
  DELIVERED:            "green",
  CANCELLED:            "gray",
};

export const WARRANTY_STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "green",
  EXPIRED:   "red",
  CLAIMED:   "blue",
  CANCELLED: "gray",
};

export const SHOP_STATUS_COLORS: Record<string, string> = {
  TRIAL:     "blue",
  ACTIVE:    "green",
  EXPIRED:   "red",
  SUSPENDED: "orange",
  CANCELLED: "gray",
};

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  TRIAL:     "blue",
  ACTIVE:    "green",
  EXPIRED:   "red",
  SUSPENDED: "orange",
  CANCELLED: "gray",
  PAST_DUE:  "yellow",
};

export const IMEI_STATUS_COLORS: Record<string, string> = {
  AVAILABLE:    "green",
  RESERVED:     "yellow",
  SOLD:         "gray",
  RETURNED:     "blue",
  UNDER_REPAIR: "orange",
  REPLACED:     "teal",
};

export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "green",
  INACTIVE: "gray",
};
