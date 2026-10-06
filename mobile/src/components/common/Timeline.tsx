import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Typography } from '../typography';

/** Generic, screen-agnostic - not tied to Job/Ticket types, so any future timeline (audit log, history, activity feed) can reuse it. */
export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  emptyLabel?: string;
}

export function Timeline({ items, emptyLabel = 'No history yet.' }: TimelineProps) {
  const { theme } = useTheme();

  if (items.length === 0) {
    return (
      <Typography variant="caption" color="textSecondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <View>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: theme.colors.borderMuted }]} /> : null}
            </View>
            <View style={[styles.content, { paddingBottom: isLast ? 0 : theme.spacing.lg }]}>
              <Typography variant="body">{item.title}</Typography>
              {item.description ? (
                <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  {item.description}
                </Typography>
              ) : null}
              <Typography variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                {item.timestamp}
              </Typography>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rail: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginLeft: 8,
  },
});
