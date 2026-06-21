import * as RadixTooltip from '@radix-ui/react-tooltip';
import * as React from 'react';

// 对外保持与原 @reach/tooltip 相近的 `label` API，封装 Radix Tooltip。
// 全局的 RadixTooltip.Provider 在 app/providers.tsx 中提供。
export function Tooltip({
  label,
  children,
  'aria-label': ariaLabel,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  'aria-label'?: string;
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          className="tooltip-content"
          sideOffset={5}
          aria-label={ariaLabel}
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
