import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { DualListEditor } from '~/components/shared/DualListEditor';
import { CONNECTION_COLUMN_MAP, CONNECTION_COLUMNS } from '~/modules/connections/utils';

type Props = {
  enabledIds: string[];
  setColumns: (ids: string[]) => void;
  addColumn: (id: string) => void;
  removeColumn: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
};

// The available list always follows CONNECTION_COLUMNS order.
const availableColumnIds = (enabledIds: string[]) =>
  CONNECTION_COLUMNS.filter((c) => !enabledIds.includes(c.id)).map((c) => c.id);

/**
 * ColumnsEditor shows the enabled columns (sortable) next to the available ones. Dragging
 * within the enabled list reorders it; dragging between the lists enables or disables a column.
 */
export function ColumnsEditor({
  enabledIds,
  setColumns,
  addColumn,
  removeColumn,
  onDraggingChange,
}: Props) {
  const { t } = useTranslation();
  const renderItem = React.useCallback((id: string) => t(CONNECTION_COLUMN_MAP[id].labelKey), [t]);

  return (
    <DualListEditor
      enabledIds={enabledIds}
      getAvailableIds={availableColumnIds}
      onChange={setColumns}
      onAdd={addColumn}
      onRemove={removeColumn}
      renderItem={renderItem}
      enabledTitle={t('columns_enabled')}
      availableTitle={t('columns_available')}
      enabledEmptyText={t('columns_drop_here')}
      availableEmptyText={t('columns_all_enabled')}
      addLabel={t('add_column')}
      onDraggingChange={onDraggingChange}
    />
  );
}
