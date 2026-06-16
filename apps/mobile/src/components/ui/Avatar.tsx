import React, { useState } from 'react';
import { Avatar as PaperAvatar } from 'react-native-paper';
import { getInitials } from '@/lib/format';
import { useAppTheme } from '@/lib/ThemeProvider';

interface AvatarProps {
  uri?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  size?: number;
}

/** Avatar image with an initials fallback. Standardizes the repeated
 * `Avatar.Image ? : Avatar.Text(getInitials)` pattern and adds graceful
 * onError handling (most call sites lacked it). */
export function Avatar({ uri, firstName, lastName, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const { tokens } = useAppTheme();
  const showImage = !!uri && !failed;

  if (showImage) {
    return (
      <PaperAvatar.Image
        size={size}
        source={{ uri: uri as string }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <PaperAvatar.Text
      size={size}
      label={getInitials(firstName, lastName)}
      style={{ backgroundColor: tokens.surfaceVariant }}
    />
  );
}
