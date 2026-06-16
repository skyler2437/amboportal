import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TextInput, TextInput as RNTextInput } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '@/lib/haptics';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const message = text.trim();
    setSending(true);
    setText('');

    hapticLight();

    try {
      await onSend(message);
    } finally {
      setSending(false);
      // Keep keyboard open after sending
      inputRef.current?.focus();
    }
  };

  const handleChangeText = (value: string) => {
    setText(value);
    if (value.trim() && onTyping) {
      onTyping();
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(8, insets.bottom) }]}>
      <TextInput
        ref={inputRef}
        placeholder="Type a message..."
        placeholderTextColor={tokens.textMuted}
        value={text}
        onChangeText={handleChangeText}
        style={styles.input}
        multiline
        maxLength={2000}
        blurOnSubmit={false}
        editable={!disabled}
      />
      <IconButton
        icon="send"
        mode="contained"
        size={20}
        onPress={handleSend}
        disabled={!text.trim() || sending || disabled}
      />
    </View>
  );
}

const makeStyles = (t: SemanticTokens) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
    gap: 4,
  },
  input: {
    flex: 1,
    backgroundColor: t.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: t.textPrimary,
  },
});
