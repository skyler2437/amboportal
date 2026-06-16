import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { FAB, Portal, Dialog, TextInput, Button, Text, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/providers/AuthProvider';
import { useResources, Resource } from '@/hooks/useResources';
import { ResourceCard } from '@/components/ResourceCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { EmptyState } from '@/components/EmptyState';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

export default function AdminResources() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const { session } = useAuth();
  const userId = session?.user?.id || '';
  const { resources, loading, refetch, uploadResource, deleteResource } = useResources();
  const [uploading, setUploading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile(result.assets[0]);
        setTitle(result.assets[0].name || '');
        setDialogVisible(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) return;
    setUploading(true);
    try {
      await uploadResource(
        title.trim(),
        description.trim(),
        selectedFile.name || 'file',
        selectedFile.uri,
        selectedFile.mimeType || 'application/octet-stream',
        selectedFile.size || 0,
        userId
      );
      setDialogVisible(false);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
    } catch {
      Alert.alert('Error', 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (resourceId: string, fileUrl: string) => {
    Alert.alert('Delete Resource', 'Are you sure you want to delete this resource?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteResource(resourceId, fileUrl);
          } catch {
            Alert.alert('Error', 'Failed to delete resource');
          }
        },
      },
    ]);
  };

  if (loading && resources.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Resource }) => (
          <ResourceCard
            title={item.title}
            description={item.description}
            fileUrl={item.file_url}
            fileType={item.file_type}
            fileSize={item.file_size}
            createdAt={item.created_at}
            showDelete
            onDelete={() => handleDelete(item.id, item.file_url)}
          />
        )}
        contentContainerStyle={resources.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="folder-outline" title="No resources" subtitle="Upload resources for ambassadors" />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      />

      <FAB icon="plus" color={tokens.onAccent} style={styles.fab} onPress={handlePickFile} accessibilityLabel="Upload new resource" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Upload Resource</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {selectedFile && (
              <View style={styles.filePreview}>
                <MaterialCommunityIcons name="file-outline" size={20} color={tokens.textSecondary} />
                <View style={styles.fileInfo}>
                  <Text variant="bodySmall" style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.fileSize}>
                    {selectedFile.size ? formatFileSize(selectedFile.size) : ''}
                    {selectedFile.mimeType ? ` · ${selectedFile.mimeType.split('/').pop()}` : ''}
                  </Text>
                </View>
              </View>
            )}
            <TextInput
              mode="outlined"
              label="Title"
              value={title}
              onChangeText={setTitle}
              dense
            />
            <TextInput
              mode="outlined"
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              dense
            />
            {uploading && (
              <ProgressBar indeterminate style={styles.progressBar} />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={uploading}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleUpload}
              loading={uploading}
              disabled={!title.trim() || uploading}
            >
              Upload
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  list: { padding: 16 },
  emptyContainer: { flex: 1, padding: 16 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: t.accentSolid,
  },
  dialogContent: { gap: 12 },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.surfaceVariant,
    padding: 10,
    borderRadius: 8,
  },
  fileInfo: { flex: 1 },
  fileName: { fontWeight: '600', color: t.textPrimary },
  fileSize: { color: t.textMuted },
  progressBar: { borderRadius: 4 },
});
