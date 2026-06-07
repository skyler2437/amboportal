import React from 'react';
import { Text, type TextStyle } from 'react-native';

/**
 * Renders text with basic inline formatting:
 *   **bold**  →  bold weight
 *   *italic*  →  italic style
 */
export function FormattedText({
  children,
  style,
  numberOfLines,
  variant,
}: {
  children: string;
  style?: TextStyle;
  numberOfLines?: number;
  variant?: string;
}) {
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {/* `as any`: react-native is hoisted against @types/react@18 while this
          app source resolves @types/react@19, so the ReactNode types don't line
          up. Contained workaround for that monorepo type-dup, not a real error. */}
      {parseInlineFormatting(children) as any}
    </Text>
  );
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(
        <Text key={match.index} style={{ fontWeight: '700' }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      nodes.push(
        <Text key={match.index} style={{ fontStyle: 'italic' }}>
          {match[3]}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
