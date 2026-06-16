import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { FileText, Paperclip } from 'lucide-react-native';
import { isImageAttachment } from '@/lib/attachments';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';
import type { Attachment } from '@/hooks/usePosts';

interface PostAttachmentsProps {
  attachments: Attachment[];
  variant?: 'full' | 'compact';
}

export function PostAttachments({ attachments, variant = 'full' }: PostAttachmentsProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((a) => !isImageAttachment(a));

  if (variant === 'compact') {
    const thumbs = images.slice(0, 2);
    return (
      <View style={styles.compactRow}>
        {thumbs.map((img) => (
          <Image key={img.id} source={{ uri: img.file_url }} style={styles.compactThumb} />
        ))}
        {files.length > 0 && (
          <View style={styles.fileChip}>
            <Paperclip size={13} color={tokens.textSecondary} />
            <Text variant="bodySmall" style={styles.fileChipText}>
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      {images.length > 0 && (
        <View style={images.length === 1 ? styles.singleImageWrap : styles.imageGrid}>
          {images.map((img) => (
            <Pressable
              key={img.id}
              onPress={() => Linking.openURL(img.file_url).catch(() => {})}
              style={images.length === 1 ? styles.singleImagePress : styles.gridImagePress}
            >
              <Image
                source={{ uri: img.file_url }}
                style={images.length === 1 ? styles.singleImage : styles.gridImage}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      )}
      {files.map((file) => (
        <Pressable key={file.id} onPress={() => Linking.openURL(file.file_url).catch(() => {})} style={styles.fileRow}>
          <FileText size={18} color={tokens.textSecondary} />
          <Text variant="bodyMedium" style={styles.fileName} numberOfLines={1}>
            {file.file_name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  compactThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: t.surfaceVariant },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surfaceVariant, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fileChipText: { color: t.textSecondary },
  fullContainer: { marginTop: 12, gap: 8 },
  singleImageWrap: {},
  singleImagePress: { width: '100%' },
  singleImage: { width: '100%', height: 240, borderRadius: 12, backgroundColor: t.surfaceVariant },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridImagePress: { width: '49%' },
  gridImage: { width: '100%', height: 150, borderRadius: 10, backgroundColor: t.surfaceVariant },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1, borderColor: t.border, borderRadius: 10 },
  fileName: { flex: 1, color: t.textPrimary },
});
