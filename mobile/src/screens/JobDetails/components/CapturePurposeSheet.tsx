import { useState } from 'react';
import { Camera, Images } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Typography } from '@/components';
import { useTheme } from '@/hooks';
import { ATTACHMENT_PURPOSE_LABELS, ATTACHMENT_PURPOSE_OPTIONS } from '@/constants';
import type { AttachmentPurpose } from '@/models';

export interface CapturePurposeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseCamera: (purpose: AttachmentPurpose) => void;
  onChooseGallery: (purpose: AttachmentPurpose) => void;
}

/**
 * MSPL-specific step ahead of capture: the Technician picks *why* the evidence is being captured
 * (`AttachmentPurpose`) before choosing camera or gallery. The mobile app only presents these
 * options - which purposes are required for which workflow action is a future backend decision.
 */
export function CapturePurposeSheet({ isOpen, onClose, onChooseCamera, onChooseGallery }: CapturePurposeSheetProps) {
  const { theme } = useTheme();
  const [purpose, setPurpose] = useState<AttachmentPurpose>('GENERAL');

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius['2xl'], borderTopRightRadius: theme.radius['2xl'], padding: theme.spacing.lg },
        ]}
      >
        <Typography variant="title">Add Evidence</Typography>
        <Typography variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
          Select what this photo is for
        </Typography>

        <View style={[styles.purposeGrid, { gap: theme.spacing.sm, marginTop: theme.spacing.lg }]}>
          {ATTACHMENT_PURPOSE_OPTIONS.map((option) => {
            const selected = option === purpose;
            return (
              <Pressable
                key={option}
                onPress={() => setPurpose(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={ATTACHMENT_PURPOSE_LABELS[option]}
                style={[
                  styles.purposeChip,
                  {
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surface,
                    borderRadius: theme.radius.full,
                    paddingHorizontal: theme.spacing.md,
                  },
                ]}
              >
                <Typography variant="label" color={selected ? 'primary' : 'textSecondary'}>
                  {ATTACHMENT_PURPOSE_LABELS[option]}
                </Typography>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.actionsRow, { gap: theme.spacing.md, marginTop: theme.spacing['2xl'] }]}>
          <View style={styles.actionCell}>
            <Button
              label="Take Photo"
              leftIcon={<Camera size={16} color={theme.colors.onPrimary} />}
              fullWidth
              onPress={() => onChooseCamera(purpose)}
              accessibilityLabel="Take photo"
            />
          </View>
          <View style={styles.actionCell}>
            <Button
              label="Choose from Gallery"
              variant="outline"
              leftIcon={<Images size={16} color={theme.colors.primary} />}
              fullWidth
              onPress={() => onChooseGallery(purpose)}
              accessibilityLabel="Choose from gallery"
            />
          </View>
        </View>

        <Button label="Cancel" variant="ghost" fullWidth onPress={onClose} accessibilityLabel="Cancel adding evidence" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    paddingBottom: 32,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  purposeChip: {
    borderWidth: 1,
    paddingVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionCell: {
    flex: 1,
  },
});
