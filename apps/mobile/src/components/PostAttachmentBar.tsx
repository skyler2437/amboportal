import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react-native';
import {
  MAX_POST_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  isAllowedFileName,
  isImageAttachment,
  formatBytes,
  type PickedAsset,
} from '@/lib/attachments';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

interface PostAttachmentBarProps {
  attachments: PickedAsset[];
  onChange: (next: PickedAsset[]) => void;
}

export function PostAttachmentBar({ attachments, onChange }: PostAttachmentBarProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  const add = (asset: PickedAsset) => {
    if (attachments.length >= MAX_POST_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_POST_ATTACHMENTS} files.`);
      return;
    }
    if (!isAllowedFileName(asset.name)) {
      Alert.alert('Unsupported file', 'That file type is not allowed.');
      return;
    }
    if (asset.size > MAX_ATTACHMENT_BYTES) {
      Alert.alert('File too large', 'Each file must be 10 MB or smaller.');
      return;
    }
    onChange([...attachments, asset]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    add({
      uri: a.uri,
      name: a.fileName || `image_${Date.now()}.jpg`,
      mimeType: a.mimeType || 'image/jpeg',
      size: a.fileSize ?? 0,
    });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    add({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType || 'application/octet-stream',
      size: a.size ?? 0,
    });
  };

  const remove = (uri: string) => onChange(attachments.filter((x) => x.uri !== uri));

  return (
    <View style={styles.container}>
      {attachments.length > 0 && (
        <View style={styles.chips}>
          {attachments.map((a) => (
            <View key={a.uri} style={styles.chip}>
              {isImageAttachment({ file_name: a.name, file_type: a.mimeType }) ? (
                <ImageIcon size={14} color={tokens.textSecondary} />
              ) : (
                <FileText size={14} color={tokens.textSecondary} />
              )}
              <Text variant="bodySmall" style={styles.chipText} numberOfLines={1}>
                {a.name}
              </Text>
              <Text variant="bodySmall" style={styles.chipSize}>{formatBytes(a.size)}</Text>
              <Pressable onPress={() => remove(a.uri)} hitSlop={8} accessibilityLabel={`Remove ${a.name}`}>
                <X size={15} color={tokens.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.bar}>
        <Pressable onPress={pickFile} hitSlop={8} accessibilityLabel="Attach file" style={styles.iconBtn}>
          <Paperclip size={22} color={tokens.textSecondary} />
        </Pressable>
        <Pressable onPress={pickImage} hitSlop={8} accessibilityLabel="Attach image" style={styles.iconBtn}>
          <ImageIcon size={22} color={tokens.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingBottom: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', backgroundColor: t.surfaceVariant, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chipText: { color: t.textSecondary, flexShrink: 1 },
  chipSize: { color: t.textMuted },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: {},
});
