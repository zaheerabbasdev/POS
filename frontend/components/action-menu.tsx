"use client";

import { Menu, ActionIcon, Tooltip } from "@mantine/core";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** Renders in red — use for delete / cancel / archive */
  destructive?: boolean;
  disabled?: boolean;
  /** Renders a divider ABOVE this item */
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  tooltip?: string;
  disabled?: boolean;
}

/**
 * Compact ⋮ action menu for table rows.
 * Replaces 4–6 inline icon buttons per row with a clean dropdown.
 */
export function ActionMenu({ items, tooltip = "Actions", disabled = false }: ActionMenuProps) {
  return (
    <Menu shadow="sm" width={180} position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={tooltip} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            disabled={disabled}
            aria-label={tooltip}
          >
            <MoreHorizontal size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {items.map((item, index) => (
          <span key={index}>
            {item.dividerBefore && <Menu.Divider />}
            <Menu.Item
              leftSection={item.icon}
              color={item.destructive ? "red" : undefined}
              onClick={item.onClick}
              disabled={item.disabled}
            >
              {item.label}
            </Menu.Item>
          </span>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
