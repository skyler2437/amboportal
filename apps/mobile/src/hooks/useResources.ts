import { useState, useEffect, useCallback } from 'react';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, demoResources } from '@/lib/demo';

export interface Resource {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
}

function useResourcesReal() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setResources((data as Resource[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const uploadResource = async (
    title: string,
    description: string,
    fileName: string,
    fileUri: string,
    fileType: string,
    fileSize: number,
    uploadedBy: string
  ) => {
    // Upload file to storage
    const filePath = `${Date.now()}_${fileName}`;
    // Read the file's real bytes. In React Native, fetch(uri).blob() yields an
    // empty/opaque blob that supabase-js uploads as a 0-byte file.
    const bytes = await new File(fileUri).bytes();

    const { error: uploadErr } = await supabase.storage
      .from('resources')
      .upload(filePath, bytes, { contentType: fileType });
    if (uploadErr) throw uploadErr;

    // Get public URL
    const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);

    // Insert metadata
    const { error: insertErr } = await supabase.from('resources').insert({
      title,
      description: description || null,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: fileSize,
      uploaded_by: uploadedBy,
    });
    if (insertErr) throw insertErr;

    await fetchResources();
  };

  const deleteResource = async (resourceId: string, fileUrl: string) => {
    // Extract file path from URL
    const parts = fileUrl.split('/resources/');
    if (parts.length > 1) {
      const filePath = parts[parts.length - 1];
      await supabase.storage.from('resources').remove([filePath]);
    }

    const { error: err } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);
    if (err) throw err;

    await fetchResources();
  };

  return { resources, loading, error, refetch: fetchResources, uploadResource, deleteResource };
}

function useResourcesDemo() {
  return {
    resources: demoResources as Resource[],
    loading: false,
    error: null as string | null,
    refetch: async () => {},
    uploadResource: async (
      _title: string,
      _description: string,
      _fileName: string,
      _fileUri: string,
      _fileType: string,
      _fileSize: number,
      _uploadedBy: string
    ) => {},
    deleteResource: async (_resourceId: string, _fileUrl: string) => {},
  };
}

export const useResources = DEMO_MODE ? useResourcesDemo : useResourcesReal;
