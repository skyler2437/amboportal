import React from 'react';
import { View, Image, StyleSheet, Pressable, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { FileText, Paperclip } from 'lucide-react-native';
import { isImageAttachment } from '@/lib/attachments';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, type SemanticTokens } from '@/lib/theme';
import type { Attachment } from '@/hooks/usePosts';

interface PostAttachmentsProps {
  attachments: Attachment[];
  variant?: 'full' | 'compact';
}

export function PostAttachments({ attachments, variant = 'full' }: PostAttachmentsProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);

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
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  compactThumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: t.surfaceVariant },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: t.surfaceVariant, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  fileChipText: { color: t.textSecondary },
  fullContainer: { marginTop: space.md, gap: space.sm },
  singleImageWrap: {},
  singleImagePress: { width: '100%' },
  singleImage: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: t.surfaceVariant },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gridImagePress: { width: '49%' },
  gridImage: { width: '100%', height: 150, borderRadius: radius.md, backgroundColor: t.surfaceVariant },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderWidth: 1, borderColor: t.border, borderRadius: radius.md },
  fileName: { flex: 1, color: t.textPrimary },
});
