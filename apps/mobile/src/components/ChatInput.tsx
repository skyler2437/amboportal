import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TextInput as RNTextInput } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '@/lib/haptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { space, radius, fontSize, type SemanticTokens } from '@/lib/theme';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const { styles, tokens } = useThemedStyles(makeStyles);
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
    <View style={[styles.container, { paddingBottom: Math.max(space.sm, insets.bottom) }]}>
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
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderTopColor: t.border,
    gap: space.xs,
  },
  input: {
    flex: 1,
    backgroundColor: t.surfaceVariant,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: fontSize.lg,
    maxHeight: 100,
    color: t.textPrimary,
  },
});
