import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useAppTheme } from '@/lib/ThemeProvider';
import type { SemanticTokens } from '@/lib/theme';

type ActiveField =
  | 'startDate'
  | 'startTime'
  | 'endDate'
  | 'endTime'
  | null;

interface EventDateTimePickerProps {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onAllDayChange: (allDay: boolean) => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventDateTimePicker({
  startDate,
  endDate,
  allDay,
  onStartDateChange,
  onEndDateChange,
  onAllDayChange,
}: EventDateTimePickerProps) {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => makeStyles(tokens), [tokens]);
  const [activeField, setActiveField] = useState<ActiveField>(null);

  const toggleField = (field: ActiveField) => {
    setActiveField((prev) => (prev === field ? null : field));
  };

  const handleAllDayChange = (value: boolean) => {
    onAllDayChange(value);
    if (value) {
      // Set start to midnight, end to 23:59
      const newStart = new Date(startDate);
      newStart.setHours(0, 0, 0, 0);
      onStartDateChange(newStart);

      const newEnd = new Date(endDate);
      newEnd.setHours(23, 59, 0, 0);
      onEndDateChange(newEnd);
    }
    setActiveField(null);
  };

  const handleStartChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setActiveField(null);
    }
    if (!selectedDate) return;

    const newStart = new Date(selectedDate);
    if (allDay) {
      newStart.setHours(0, 0, 0, 0);
    }
    onStartDateChange(newStart);

    // Always auto-adjust end to 1 hour after start
    if (allDay) {
      const newEnd = new Date(newStart);
      newEnd.setHours(23, 59, 0, 0);
      onEndDateChange(newEnd);
    } else {
      const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
      onEndDateChange(newEnd);
    }
  };

  const handleEndChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === 'android') {
      setActiveField(null);
    }
    if (!selectedDate) return;

    const newEnd = new Date(selectedDate);
    if (allDay) {
      newEnd.setHours(23, 59, 0, 0);
    }
    onEndDateChange(newEnd);
  };

  const isIOS = Platform.OS === 'ios';

  const renderPicker = (
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime'
  ) => {
    if (activeField !== field) return null;

    const isStart = field === 'startDate' || field === 'startTime';
    const mode = field === 'startDate' || field === 'endDate' ? 'date' : 'time';
    const value = isStart ? startDate : endDate;
    const onChange = isStart ? handleStartChange : handleEndChange;

    if (isIOS) {
      return (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={value}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            onChange={onChange}
            style={styles.iosPicker}
          />
        </View>
      );
    }

    // Android: renders as modal automatically
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={onChange}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* All Day Toggle */}
      <View style={styles.row}>
        <Text variant="bodyLarge" style={styles.label}>
          All Day
        </Text>
        <Switch
          value={allDay}
          onValueChange={handleAllDayChange}
        />
      </View>

      <View style={styles.separator} />

      {/* Starts Row */}
      <View style={styles.row}>
        <Text variant="bodyLarge" style={styles.label}>
          Starts
        </Text>
        <View style={styles.pills}>
          <TouchableOpacity
            style={[
              styles.pill,
              activeField === 'startDate' && styles.pillActive,
            ]}
            onPress={() => toggleField('startDate')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                activeField === 'startDate' && styles.pillTextActive,
              ]}
            >
              {formatDate(startDate)}
            </Text>
          </TouchableOpacity>

          {!allDay && (
            <TouchableOpacity
              style={[
                styles.pill,
                activeField === 'startTime' && styles.pillActive,
              ]}
              onPress={() => toggleField('startTime')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  activeField === 'startTime' && styles.pillTextActive,
                ]}
              >
                {formatTime(startDate)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Start Pickers (inline on iOS) */}
      {renderPicker('startDate')}
      {!allDay && renderPicker('startTime')}

      <View style={styles.separator} />

      {/* Ends Row */}
      <View style={styles.row}>
        <Text variant="bodyLarge" style={styles.label}>
          Ends
        </Text>
        <View style={styles.pills}>
          <TouchableOpacity
            style={[
              styles.pill,
              activeField === 'endDate' && styles.pillActive,
            ]}
            onPress={() => toggleField('endDate')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                activeField === 'endDate' && styles.pillTextActive,
              ]}
            >
              {formatDate(endDate)}
            </Text>
          </TouchableOpacity>

          {!allDay && (
            <TouchableOpacity
              style={[
                styles.pill,
                activeField === 'endTime' && styles.pillActive,
              ]}
              onPress={() => toggleField('endTime')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  activeField === 'endTime' && styles.pillTextActive,
                ]}
              >
                {formatTime(endDate)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* End Pickers (inline on iOS) */}
      {renderPicker('endDate')}
      {!allDay && renderPicker('endTime')}
    </View>
  );
}

const makeStyles = (t: SemanticTokens) =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    label: {
      fontWeight: '600',
      color: t.textPrimary,
    },
    pills: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      backgroundColor: t.surfaceVariant,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: t.border,
    },
    pillActive: {
      backgroundColor: t.accentSolid,
      borderColor: t.accentSolid,
    },
    pillText: {
      fontSize: 15,
      color: t.textPrimary,
      fontWeight: '500',
    },
    pillTextActive: {
      color: t.onAccent,
    },
    separator: {
      height: 1,
      backgroundColor: t.divider,
    },
    pickerContainer: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    iosPicker: {
      height: 'auto' as any,
    },
  });
