import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Text, Button, ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { Check, Upload, FileText, X } from 'lucide-react-native';
import type { ApplicationData } from '@ambo/database/application-types';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontWeight, type SemanticTokens } from '@/lib/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || '';

interface StepAcademicProps {
  data: ApplicationData;
  onChange: (field: keyof ApplicationData, value: any) => void;
}

export default function StepAcademic({ data, onChange }: StepAcademicProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
  const [uploading, setUploading] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];

      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'File is too large. Max 5MB.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'transcript.pdf',
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('phone', data.phone_number);

      const res = await fetch(`${WEB_URL}/api/applications/upload-transcript`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      const { publicUrl } = await res.json();
      onChange('transcript_url', publicUrl);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload transcript');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Current Cumulative GPA *"
        mode="outlined"
        value={data.gpa !== undefined && data.gpa !== null ? String(data.gpa) : ''}
        onChangeText={(v) => {
          const num = parseFloat(v);
          onChange('gpa', v === '' ? undefined : isNaN(num) ? data.gpa : num);
        }}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Text variant="bodySmall" style={styles.hint}>Must be between 0.00 and 5.00</Text>

      <Text variant="bodyMedium" style={styles.sectionLabel}>Unofficial Transcript</Text>

      {data.transcript_url ? (
        <View style={styles.uploadedRow}>
          <FileText size={20} color={tokens.textPrimary} />
          <Text variant="bodyMedium" style={styles.uploadedText}>Transcript Uploaded</Text>
          <Button
            mode="text"
            compact
            textColor={tokens.statusBadFg}
            onPress={() => onChange('transcript_url', '')}
          >
            Remove
          </Button>
        </View>
      ) : (
        <Button
          mode="outlined"
          icon={() => uploading ? <ActivityIndicator size={16} /> : <Upload size={16} color={tokens.textSecondary} />}
          onPress={handlePickFile}
          disabled={uploading}
          style={styles.uploadButton}
        >
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </Button>
      )}
      <Text variant="bodySmall" style={styles.hint}>PDF only, max 5MB</Text>
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { gap: space.sm },
  input: { backgroundColor: t.surface },
  hint: { color: t.textMuted },
  sectionLabel: { fontWeight: fontWeight.semibold, marginTop: space.md },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    backgroundColor: t.surfaceVariant,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: t.border,
  },
  uploadedText: { flex: 1 },
  uploadButton: { borderColor: t.border, alignSelf: 'flex-start' },
});
