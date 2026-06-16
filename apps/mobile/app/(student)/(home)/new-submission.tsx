import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Menu, Divider, Card } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { SERVICE_TYPES } from '@ambo/database';

export default function NewSubmission() {
  const { session } = useAuth();
  const router = useRouter();
  const [serviceType, setServiceType] = useState('Family Tour');
  const [menuVisible, setMenuVisible] = useState(false);
  const [hours, setHours] = useState('1');
  const [credits, setCredits] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reset form when navigating back to this screen (e.g. from dashboard)
  useFocusEffect(useCallback(() => {
    setSuccess(false);
    setServiceType('Family Tour');
    setHours('1');
    setCredits('1');
    setNotes('');
  }, []));

  const handleSubmit = async () => {
    if (!serviceType.trim()) {
      Alert.alert('Error', 'Please select a service type.');
      return;
    }
    if (!hours || parseFloat(hours) <= 0) {
      Alert.alert('Error', 'Hours must be greater than 0.');
      return;
    }
    if (parseFloat(hours) > 24) {
      Alert.alert('Error', 'Hours cannot exceed 24.');
      return;
    }
    if (credits && parseInt(credits, 10) > 100) {
      Alert.alert('Error', 'Credits cannot exceed 100.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('submissions').insert({
      user_id: session?.user?.id,
      service_type: serviceType,
      hours: parseFloat(hours),
      credits: parseInt(credits || '0', 10),
      service_date: new Date().toISOString().split('T')[0],
      feedback: notes.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <>
        <Stack.Screen options={{ title: 'Submitted!' }} />
        <View style={styles.successContainer}>
          <Card elevation={0} style={styles.successCard}>
            <Card.Content style={styles.successContent}>
              <MaterialCommunityIcons name="check-circle" size={56} color="#10b981" />
              <Text variant="headlineSmall" style={styles.successTitle}>
                Submitted!
              </Text>
              <Text variant="bodyMedium" style={styles.successSubtitle}>
                Your service hours have been submitted for review.
              </Text>
            </Card.Content>
          </Card>
          <View style={styles.successActions}>
            <Button
              mode="contained"
              onPress={() => {
                setSuccess(false);
                setServiceType('Family Tour');
                setHours('1');
                setCredits('1');
                setNotes('');
              }}
            >
              Log Another
            </Button>
            <Button mode="outlined" onPress={() => router.back()}>
              Back to Dashboard
            </Button>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Log Activity' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="bodyMedium" style={styles.description}>
            Submit your service hours for admin review.
          </Text>

          {/* Service Type Picker */}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TextInput
                mode="outlined"
                label="Service Type"
                value={serviceType}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setMenuVisible(true)} />}
                onFocus={() => setMenuVisible(true)}
                showSoftInputOnFocus={false}
                style={styles.input}
              />
            }
            style={styles.menu}
          >
            <ScrollView style={styles.menuScroll}>
              {SERVICE_TYPES.map((type) => (
                <Menu.Item
                  key={type}
                  title={type}
                  onPress={() => {
                    setServiceType(type);
                    setMenuVisible(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>

          {/* Hours & Credits */}
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              label="Hours"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              mode="outlined"
              label="Credits"
              value={credits}
              onChangeText={setCredits}
              keyboardType="number-pad"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          {/* Notes */}
          <TextInput
            mode="outlined"
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            maxLength={1000}
            style={[styles.input, styles.notesInput]}
          />

          <Divider style={styles.divider} />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
          >
            Submit
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  description: { color: '#6b7280', marginBottom: 4 },
  input: { backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  notesInput: { minHeight: 100 },
  menu: { width: '92%' },
  menuScroll: { maxHeight: 300 },
  divider: { marginVertical: 8 },
  submitButton: { borderRadius: 12 },
  successContainer: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 24 },
  successCard: { backgroundColor: '#f0fdf4' },
  successContent: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  successTitle: { fontWeight: '700', color: '#166534' },
  successSubtitle: { color: '#6b7280', textAlign: 'center' },
  successActions: { gap: 12 },
});
