import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Typography } from '@/components';
import { useTheme } from '@/hooks';
import type { WorkflowAction } from '@/models';

export interface WorkflowActionsPanelProps {
  actions: WorkflowAction[];
  onExecute: (actionId: string) => void;
  isExecuting: boolean;
  executingActionId: string | null;
  error: string | null;
}

/**
 * Fully data-driven: every button comes from `actions`, which the backend (via
 * `WorkflowRepository`) decided to offer - there is no hardcoded action name, icon, or condition
 * anywhere in this file. Renders nothing when the backend currently offers no actions, so it
 * never implies a job can be acted on when it can't.
 */
function WorkflowActionsPanelComponent({ actions, onExecute, isExecuting, executingActionId, error }: WorkflowActionsPanelProps) {
  const { theme } = useTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <Card>
      <Typography variant="title" style={{ marginBottom: theme.spacing.md }}>
        Actions
      </Typography>
      {error ? (
        <Typography variant="body" color="danger" style={{ marginBottom: theme.spacing.md }} accessibilityRole="alert">
          {error}
        </Typography>
      ) : null}
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        {actions.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            onPress={() => onExecute(action.id)}
            loading={executingActionId === action.id}
            disabled={isExecuting}
            accessibilityLabel={action.label}
          />
        ))}
      </View>
    </Card>
  );
}

export const WorkflowActionsPanel = memo(WorkflowActionsPanelComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
