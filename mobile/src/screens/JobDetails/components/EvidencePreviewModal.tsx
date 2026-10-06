import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Typography } from '@/components';
import { formatDateTime } from '@/utils';
import { ATTACHMENT_PURPOSE_LABELS } from '@/constants';
import { palette } from '@/theme';
import type { Attachment } from '@/models';
import { UploadStatusBadge } from './UploadStatusBadge';
import { ZoomableImage } from './ZoomableImage';

export interface EvidencePreviewModalProps {
  attachments: Attachment[];
  initialIndex: number | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return 'Unknown size';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

/** Full-screen preview (Part 7): swipe between images via a paging ScrollView, pinch-zoom/pan per
 * image via `ZoomableImage`, and a metadata panel. Replaces the read-only `PhotoPreviewModal` from
 * the Job Workspace phase - Share/Download stay out of scope here too (no upload backend yet). */
export function EvidencePreviewModal({ attachments, initialIndex, onClose }: EvidencePreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex ?? 0);
  const isOpen = initialIndex !== null;
  const active = attachments[activeIndex];

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: `${palette.slate950}F2` }]}>
        <View style={styles.topBar}>
          <Typography variant="caption" style={{ color: palette.white }}>
            {attachments.length > 0 ? `${activeIndex + 1} of ${attachments.length}` : ''}
          </Typography>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close preview" hitSlop={12} style={styles.closeButton}>
            <X size={22} color={palette.white} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: (initialIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        >
          {attachments.map((attachment) => (
            <View key={attachment.id} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
              {attachment.fullImageUrl ? (
                <ZoomableImage uri={attachment.fullImageUrl} width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.7} />
              ) : null}
            </View>
          ))}
        </ScrollView>

        {active ? (
          <View style={[styles.metadataPanel, { backgroundColor: `${palette.slate900}F2` }]}>
            <Typography variant="body" style={{ color: palette.white }}>
              {active.fileName}
            </Typography>
            <View style={styles.metadataRow}>
              <Typography variant="caption" style={{ color: palette.slate300 }}>
                {ATTACHMENT_PURPOSE_LABELS[active.purpose]} &middot; {formatFileSize(active.fileSize)}
              </Typography>
              <UploadStatusBadge status={active.status} uploadProgress={active.uploadProgress} />
            </View>
            <Typography variant="caption" style={{ color: palette.slate400, marginTop: 4 }}>
              Captured {formatDateTime(active.capturedAt)}
            </Typography>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadataPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
