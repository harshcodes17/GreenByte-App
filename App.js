import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ImageBackground
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
// Firebase reCAPTCHA removed
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { firebase, firebaseAuth, firebaseConfig } from './firebaseClient';

import { BlurView } from 'expo-blur';
import { BackgroundShapes } from './src/components/BackgroundShapes';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const THEME = {
  bg: '#F4FBF8',
  primary: '#0B6B4B',
  primaryDark: '#084A34',
  accent: '#F9A826',
  card: '#FFFFFF',
  text: '#11322A',
  muted: '#6A837B',
  border: '#D5E7DF'
};

const DARK_THEME = {
  bg: '#0B2E26',
  primary: '#20C997',
  primaryDark: '#128C7E',
  accent: '#F9D680',
  card: 'rgba(20, 50, 40, 0.7)',
  text: '#F4FBF8',
  muted: '#A7C4BA',
  border: 'rgba(255, 255, 255, 0.1)'
};

const PRICE_CATALOG = {
  'Personal Gadgets': [
    { name: 'Phones', price: 15, unit: 'pc' },
    { name: 'Laptops', price: 250, unit: 'pc' },
    { name: 'Tablets', price: 150, unit: 'pc' },
    { name: 'Smartwatches', price: 10, unit: 'pc' }
  ],
  'Home Appliances': [
    { name: 'Microwaves', price: 150, unit: 'pc' },
    { name: 'Mixers', price: 50, unit: 'pc' },
    { name: 'Kettles', price: 15, unit: 'pc' },
    { name: 'Irons', price: 15, unit: 'pc' },
    { name: 'Fans', price: 50, unit: 'pc' }
  ],
  'Large Electronics': [
    { name: 'Refrigerators', price: 500, unit: 'pc' },
    { name: 'Washing Machines', price: 250, unit: 'pc' },
    { name: 'ACs', price: 1000, unit: 'pc' }
  ],
  'Display Units': [
    { name: 'LED TVs', price: 100, unit: 'pc' },
    { name: 'CRT TVs', price: 50, unit: 'pc' },
    { name: 'Computer Monitors', price: 25, unit: 'pc' }
  ],
  'IT Peripherals': [
    { name: 'Printers', price: 50, unit: 'pc' },
    { name: 'Scanners', price: 25, unit: 'pc' },
    { name: 'CPUs', price: 250, unit: 'pc' },
    { name: 'UPS', price: 150, unit: 'pc' }
  ],
  'Mixed E-Scrap': [
    { name: 'Cables', price: 50, unit: 'kg' },
    { name: 'Remotes', price: 10, unit: 'kg' },
    { name: 'Keyboards', price: 5, unit: 'pc' },
    { name: 'Electronic Toys', price: 15, unit: 'kg' }
  ]
};

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'recycler', label: 'Recycler' },
  { value: 'admin', label: 'Admin' }
];

// Replace localhost with your machine LAN IP when testing on a physical device.
const API_BASE_URL = 'http://localhost:4000/api/v1';
const DEFAULT_COUNTRY_CODE = '91';
function useTheme() {
  const { isDarkMode } = useContext(AppContext);
  return isDarkMode ? DARK_THEME : THEME;
}

const AppContext = createContext(null);
const ToastContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

function useToast() {
  return useContext(ToastContext);
}

function normalizePhoneDigits(phone) {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return digits.slice(-10);
  }

  return digits;
}

function formatPhoneForFirebase(phone) {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return '';
}

async function verifyRoleAccount(phone, role) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      role
    })
  });
}

function getFirebaseAuthErrorMessage(error) {
  const code = error?.code || '';

  if (code.includes('invalid-phone-number')) {
    return 'Enter a valid phone number with the correct country format.';
  }

  if (code.includes('too-many-requests')) {
    return 'Firebase blocked more OTP attempts for now. Please wait and try again.';
  }

  if (code.includes('quota-exceeded')) {
    return 'Your Firebase SMS quota is exhausted. Check the Firebase console.';
  }

  if (code.includes('captcha-check-failed') || code.includes('invalid-app-credential')) {
    return 'reCAPTCHA verification failed. Please try sending the OTP again.';
  }

  if (code.includes('invalid-verification-code') || code.includes('code-expired')) {
    return 'The OTP is invalid or expired. Please request a fresh code.';
  }

  if (code.includes('operation-not-allowed')) {
    return 'Phone authentication is not enabled in Firebase Authentication.';
  }

  if (code.includes('network-request-failed')) {
    return 'Network request failed. Confirm internet access and try again.';
  }

  return error?.message || 'Firebase authentication failed.';
}

function computeItemEstimate(item) {
  if (item.unit === 'kg') {
    return item.quantity * item.weightKg * item.price;
  }
  return item.quantity * item.price;
}

const TRACKING_STEPS = [
  {
    key: 'estimated',
    title: 'Pending Admin Approval',
    description: 'We are estimating your items using AI and awaiting admin approval.',
    icon: 'clock-outline'
  },
  {
    key: 'negotiating',
    title: 'Price Negotiation',
    description: 'Admin has proposed a new price. Please review and respond.',
    icon: 'handshake-outline'
  },
  {
    key: 'confirmed',
    title: 'Request Confirmed',
    description: 'Your pickup request has been created and locked in.',
    icon: 'clipboard-check-outline'
  },
  {
    key: 'assigned',
    title: 'Drop-off Location Approved',
    description: 'Your drop-off location has been verified and approved.',
    icon: 'account-check-outline'
  },
  {
    key: 'onTheWay',
    title: 'Drop-off Pending',
    description: 'Dropping off the waste at the recyclers place.',
    icon: 'map-marker-path'
  },
  {
    key: 'collected',
    title: 'Collected',
    description: 'The e-waste has been collected and is being transported.',
    icon: 'package-variant-closed'
  },
  {
    key: 'recycled',
    title: 'Recycled',
    description: 'Your items have been safely recycled.',
    icon: 'recycle'
  },
  {
    key: 'completed',
    title: 'Payment Issued',
    description: 'Admin has issued payment for your request.',
    icon: 'check-circle-outline'
  }
];

const PICKUP_PARTNERS = [
  { name: 'Rohit Patil', phone: '+91 98765 23110' },
  { name: 'Ayesha Khan', phone: '+91 98765 23111' },
  { name: 'Nikhil Joshi', phone: '+91 98765 23112' },
  { name: 'Sneha More', phone: '+91 98765 23113' }
];

const REQUEST_STATUS_META = {
  submitted:         { label: 'Submitted', tone: 'neutral' },
  estimated:         { label: 'Pending Admin Approval', tone: 'warning' },
  admin_negotiated:  { label: 'Negotiation Pending', tone: 'warning' },
  price_accepted:    { label: 'Awaiting recycler', tone: 'neutral' },
  assigned:          { label: 'Recycler assigned', tone: 'active' },
  in_transit:        { label: 'Sent to Facility', tone: 'active' },
  collected:         { label: 'Collected by Recycler', tone: 'active' },
  recycled:          { label: 'At Facility (Awaiting Payment)', tone: 'warning' },
  paid:              { label: 'Payment issued', tone: 'success' },
  completed:         { label: 'Completed', tone: 'success' },
  rejected:          { label: 'Rejected', tone: 'danger' },
  cancelled:         { label: 'Cancelled', tone: 'danger' }
};

function getPickupCreatedAtMs(record) {
  if (record?.createdAtMs) {
    return record.createdAtMs;
  }

  const parsed = Date.parse(record?.createdAt || '');
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeFrontendPickupStatus(status) {
  // Pass backend statuses through directly — do NOT mangle them.
  // The tracking system and UI both read status directly.
  const validStatuses = [
    'submitted', 'estimated', 'admin_negotiated', 'price_accepted',
    'assigned', 'in_transit', 'collected', 'recycled',
    'paid', 'completed', 'rejected', 'cancelled'
  ];
  return validStatuses.includes(status) ? status : 'estimated';
}

function formatPickupDate(value) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}

function toTrackingId(sourceId) {
  const digits = String(sourceId || '').replace(/\D/g, '');
  const suffix = digits.slice(-6) || '000000';
  return `GB-${suffix}`;
}

function mapBackendPickupToFrontend(pickup) {
  if (!pickup) {
    return null;
  }

  const pickupId = String(pickup._id || pickup.id || Date.now());

  return {
    id: pickupId,
    trackingId: pickup.trackingId || toTrackingId(pickupId),
    createdAt: formatPickupDate(pickup.createdAt),
    createdAtMs: Date.parse(pickup.createdAt || '') || Date.now(),
    status: normalizeFrontendPickupStatus(pickup.status),
    customerName: pickup.user?.name || '',
    pickupPartner:
      pickup.recyclerAssignment?.recyclerName || pickup.recyclerAssignment?.recyclerPhone
        ? {
            name: pickup.recyclerAssignment.recyclerName || 'GreenByte Recycler',
            phone: pickup.recyclerAssignment.recyclerPhone || ''
          }
        : createPickupPartner(pickupId),
    assignedRecyclerId: pickup.recyclerAssignment?.recycler || '',
    assignedRecyclerPhone: pickup.recyclerAssignment?.recyclerPhone || '',
    assignedRecyclerName: pickup.recyclerAssignment?.recyclerName || '',
    recyclerDecisions: (pickup.recyclerDecisions || []).map((entry) => ({
      recyclerId: entry.recycler || '',
      recyclerName: entry.recyclerName || '',
      decision: entry.decision === 'accepted' ? 'accepted' : 'rejected',
      note: entry.note || ''
    })),
    requestMode: pickup.requestMode || 'pickup',
    items: (pickup.items || []).map((item, index) => ({
      id: `${pickupId}-${index}`,
      category: item.category,
      name: item.name,
      unit: item.unit,
      price: item.price,
      quantity: item.quantity,
      weightKg: item.weightKg || 0,
      condition: item.condition || '',
      photoUri: item.photoUri || ''
    })),
    estimationReasoning: pickup.pricing?.estimationReasoning || '',
    totalEstimate: pickup.totalEstimate || 0,
    pricing: {
      estimatedAmount: pickup.pricing?.estimatedAmount || 0,
      negotiatedAmount: pickup.pricing?.negotiatedAmount || null,
      acceptedByUser: pickup.pricing?.acceptedByUser ?? true
    },
    pickupDetails: {
      mode: pickup.requestMode || 'pickup',
      date: pickup.schedule?.dateLabel || '',
      time: pickup.schedule?.timeLabel || '',
      address: pickup.address || '',
      phone: pickup.phone || '',
      notes: pickup.notes || ''
    }
  };
}

async function loadPickupHistoryForUser(userId) {
  if (!userId) {
    return [];
  }

  const response = await apiRequest(`/pickups?userId=${userId}`);
  return (response.data || []).map(mapBackendPickupToFrontend).filter(Boolean);
}

function getPickupTracking(record, now = Date.now()) {
  if (!record) {
    return null;
  }

  if (record.status === 'cancelled') {
    return {
      activeStep: -1,
      currentStep: { title: 'Cancelled', description: 'This pickup request was cancelled.' },
      etaText: 'N/A'
    };
  }
  
  if (record.status === 'rejected') {
    return {
      activeStep: -1,
      currentStep: { title: 'Rejected', description: 'This pickup request was rejected.' },
      etaText: 'N/A'
    };
  }

  const explicitStepMap = {
    estimated: 0,
    submitted: 0,
    admin_negotiated: 1,
    price_accepted: 2,
    assigned: 3,
    in_transit: 4,
    collected: 5,
    recycled: 6,
    paid: 7,
    completed: 7
  };

  const elapsedMinutes = Math.max(0, Math.floor((now - getPickupCreatedAtMs(record)) / 60000));

  let activeStep = explicitStepMap[record.status];
  if (typeof activeStep !== 'number') {
    if (record.status === 'completed' || elapsedMinutes >= 9) {
      activeStep = 5;
    } else if (elapsedMinutes >= 6) {
      activeStep = 4;
    } else if (elapsedMinutes >= 3) {
      activeStep = 3;
    } else if (elapsedMinutes >= 1) {
      activeStep = 2;
    } else {
      activeStep = 1;
    }
  }

  const currentStep = TRACKING_STEPS[Math.min(activeStep, TRACKING_STEPS.length - 1)];
  const etaText =
    activeStep === 7
      ? 'Payment issued. Request complete!'
      : activeStep === 6
        ? 'Items recycled – awaiting admin payment'
        : activeStep === 5
          ? 'Items dropped off and being processed'
          : activeStep === 4
            ? 'Awaiting customer drop-off at the facility'
            : activeStep === 3
              ? 'Drop-off location approved'
              : activeStep === 2
                ? 'Price confirmed – awaiting drop-off location approval'
                : activeStep === 1
                  ? 'Admin has proposed a new price. Please review.'
                  : 'Awaiting admin to scrutinize AI price';

  return {
    activeStep,
    currentStep,
    etaText
  };
}

function createPickupPartner(seedValue) {
  const numericSeed = Number(String(seedValue).replace(/\D/g, '').slice(-6)) || 0;
  return PICKUP_PARTNERS[numericSeed % PICKUP_PARTNERS.length];
}

function getRequestStatusMeta(status) {
  return REQUEST_STATUS_META[status] || REQUEST_STATUS_META.submitted;
}

function getButtonLabel(status) {
  return {
    assigned: 'Mark as Collected',
    collected: 'Send to Facility'
  }[status];
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

function ScreenShell({ children }) {
  const { isDarkMode } = useApp();
  const bgColors = isDarkMode ? ['#051F1A', '#0B2E26'] : ['#EFFAF4', '#F8FDFA'];

  return (
    <LinearGradient colors={bgColors} style={[styles.shell, isDarkMode && { backgroundColor: '#0B2E26' }]}>
      <BackgroundShapes isDarkMode={isDarkMode} />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {children}
    </LinearGradient>
  );
}

function ToastBanner({ toast, onDismiss }) {
  const { isDarkMode } = useApp() || { isDarkMode: false };
  if (!toast) return null;
  const isError = toast.type === 'error';
  
  let borderColor = isError ? '#F5A9A0' : '#A3D9C0';
  let textColor = isError ? '#A13A2A' : '#0B6B4B';

  if (isDarkMode) {
    borderColor = isError ? '#4D241E' : '#124D3E';
    textColor = isError ? '#FF9B8C' : '#20C997';
  }

  const icon = isError ? 'alert-circle-outline' : 'check-circle-outline';

  return (
    <View style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 9999, alignItems: 'center', paddingHorizontal: 20 }}>
      <BlurView
        intensity={isDarkMode ? 40 : 60}
        tint={isDarkMode ? 'dark' : 'default'}
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: borderColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 10
        }}
      >
        <Pressable
          onPress={onDismiss}
          style={{
            padding: 16,
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={icon} size={20} color={textColor} />
          </View>
          <Text style={{ color: textColor, fontSize: 14, fontWeight: '700', flex: 1 }}>{toast.message}</Text>
          <MaterialCommunityIcons name="close" size={18} color={textColor} style={{ opacity: 0.6 }} />
        </Pressable>
      </BlurView>
    </View>
  );
}

function ScreenHeader({ title, subtitle, centered = false, compact = false }) {
  const { isDarkMode, toggleDarkMode } = useApp();
  const theme = useTheme();

  return (
    <View style={[styles.screenHeader, centered && styles.screenHeaderCentered, compact && styles.screenHeaderCompact]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: centered ? 'center' : 'space-between', width: '100%' }}>
        <Text style={[styles.sectionTitle, centered && styles.sectionTitleCentered, { color: theme.text }]}>{title}</Text>
        <Pressable 
          onPress={toggleDarkMode}
          style={({ pressed }) => ({
            padding: 8,
            borderRadius: 20,
            backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
          })}
        >
          <MaterialCommunityIcons 
            name={isDarkMode ? 'weather-sunny' : 'weather-night'} 
            size={24} 
            color={theme.primary} 
          />
        </Pressable>
      </View>
      {subtitle ? <Text style={[styles.sectionSubtitle, centered && styles.sectionSubtitleCentered, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

function padTime(value) {
  return String(value).padStart(2, '0');
}

function createDateOptions(daysAhead = 14) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  return Array.from({ length: daysAhead }, (_, index) => {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + index);
    const label = `${weekDays[nextDate.getDay()]}, ${nextDate.getDate()} ${months[nextDate.getMonth()]}`;
    const value = nextDate.toISOString().slice(0, 10);
    return { label, value };
  });
}

function createTimeOptions() {
  const slots = [];
  for (let hour = 9; hour <= 18; hour += 1) {
    for (const minute of [0, 30]) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const minuteLabel = padTime(minute);
      slots.push({
        label: `${displayHour}:${minuteLabel} ${period}`,
        value: `${padTime(hour)}:${minuteLabel}`
      });
    }
  }
  return slots;
}

function SelectionPickerModal({ visible, title, subtitle, options, selectedValue, onClose, onSelect }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          {subtitle ? <Text style={styles.modalSubtitle}>{subtitle}</Text> : null}

          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.optionRow, selected && styles.optionRowActive]}
                  onPress={() => onSelect(option)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                  {selected ? <MaterialCommunityIcons name="check-circle" size={20} color={THEME.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FullscreenImageModal({ visible, imageUri, onClose }) {
  if (!imageUri) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.9)' }]} onPress={onClose}>
        <View style={{ width: '95%', height: '85%', borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          <Image 
            source={{ uri: imageUri }} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="contain" 
          />
          <Pressable 
            style={{ position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20, zIndex: 10 }} 
            onPress={onClose}
          >
            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const DATE_OPTIONS = createDateOptions();
const TIME_OPTIONS = createTimeOptions();

function SplashScreen({ navigation }) {
  React.useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('Login');
    }, 1400);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <LinearGradient colors={['#0B6B4B', '#084A34']} style={styles.splashContainer}>
      <View style={styles.logoRing}>
        <MaterialCommunityIcons name="recycle" size={56} color="#FFFFFF" />
      </View>
      <Text style={styles.splashTitle}>GreenByte</Text>
      <Text style={styles.splashSubtitle}>Smart E-Waste Pickup</Text>
    </LinearGradient>
  );
}

function OnboardingScreen({ navigation }) {
  const slides = [
    { title: 'Transform your waste', text: 'Turn old electronics into measurable environmental impact.' },
    { title: 'Schedule pickup', text: 'Choose your date, time, and address in under a minute.' }
  ];
  const [index, setIndex] = useState(0);
  const current = slides[index];

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={[styles.heroCard, styles.glassCard]}>

          <MaterialCommunityIcons name="leaf-circle" size={72} color={THEME.primary} />
          <Text style={styles.heroTitle}>{current.title}</Text>
          <Text style={styles.heroText}>{current.text}</Text>
          <View style={styles.dotRow}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.rowGap}>
          {index < slides.length - 1 ? (
            <Pressable style={styles.primaryButton} onPress={() => setIndex(index + 1)}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={() => navigation.replace('Login')}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

function RegisterScreen({ navigation }) {
  const showToast = useToast();
  const { isDarkMode } = useApp();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [organizationName, setOrganizationName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onRegister = async () => {
    setErrorMessage('');
    const cleaned = phone.replace(/\D/g, '');
    if (name.trim().length < 2) {
      setErrorMessage('Enter your full name to register.');
      return;
    }
    if (cleaned.length < 10) {
      setErrorMessage('Enter a valid mobile number.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: cleaned,
          password,
          role,
          organizationName: role === 'customer' ? '' : organizationName.trim()
        })
      });

      showToast('Registration complete! Please log in.');
      navigation.replace('Login', {
        phone: cleaned,
        role
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={[styles.authCard, styles.glassCard, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.7)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          
          <ScreenHeader
            title="Create Account"
            subtitle="Join GreenByte to start recycling."
            centered
            compact
          />

          <Text style={[styles.label, { color: theme.text }]}>Role</Text>
          <View style={styles.roleSelectorRow}>
            {ROLE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.roleChip, 
                  role === option.value && styles.roleChipActive,
                  isDarkMode && role !== option.value && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setRole(option.value)}
              >
                <Text style={[
                  styles.roleChipText, 
                  role === option.value && styles.roleChipTextActive,
                  isDarkMode && role !== option.value && { color: theme.muted }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="John Doe"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
          />

          {role !== 'customer' ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>{role === 'recycler' ? 'Company Name' : 'Organization'}</Text>
              <TextInput
                value={organizationName}
                onChangeText={setOrganizationName}
                style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
                placeholder={role === 'recycler' ? 'Recycler company name' : 'Admin organization'}
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
              />
            </>
          ) : null}

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Secure password (min 6 chars)"
            placeholderTextColor="#91A79F"
            secureTextEntry
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="Mobile number"
            placeholderTextColor="#91A79F"
            maxLength={15}
          />

          {errorMessage ? (
            <View style={{ backgroundColor: '#FFE8E5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ color: '#A13A2A', fontSize: 13, fontWeight: '600' }}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={onRegister}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Creating Account...' : 'Create Account'}</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={() => navigation.replace('Login')}>
            <Text style={styles.textButtonText}>Already registered? Log in</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function LoginScreen({ navigation, route }) {
  const showToast = useToast();
  const prefilledPhone = route.params?.phone || '';
  const prefilledRole = route.params?.role || 'customer';
  const { setUser, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();

  const [phone, setPhone] = useState(prefilledPhone);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(prefilledRole);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onContinue = async () => {
    setErrorMessage('');
    const cleaned = normalizePhoneDigits(phone);

    if (cleaned.length < 10) {
      setErrorMessage('Enter a valid mobile number.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Enter a valid password (min 6 characters).');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: cleaned, role, password })
      });
      
      const persistedPickups = await loadPickupHistoryForUser(response.data?._id);
      setUser(response.data);
      setPickupHistory(persistedPickups);
      
      showToast(`Welcome back, ${response.data.name}!`);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={[styles.authCard, styles.glassCard, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.7)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>

          <ScreenHeader
            title="Login"
            subtitle="Enter your phone number and password"
            centered
            compact
          />

          <Text style={[styles.label, { color: theme.text }]}>Role</Text>
          <View style={styles.roleSelectorRow}>
            {ROLE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.roleChip, 
                  role === option.value && styles.roleChipActive,
                  isDarkMode && role !== option.value && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setRole(option.value)}
              >
                <Text style={[
                  styles.roleChipText, 
                  role === option.value && styles.roleChipTextActive,
                  isDarkMode && role !== option.value && { color: theme.muted }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="Registered mobile number"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            maxLength={15}
          />

          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="Your password"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            secureTextEntry
          />

          {errorMessage ? (
            <View style={{ backgroundColor: isDarkMode ? 'rgba(255, 100, 100, 0.1)' : '#FFE8E5', padding: 12, borderRadius: 10, marginVertical: 14 }}>
              <Text style={{ color: isDarkMode ? '#FF8080' : '#A13A2A', fontSize: 13, fontWeight: '600' }}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={onContinue}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Logging in...' : 'Log in'}
            </Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={() => navigation.replace('Register')}>
            <Text style={[styles.textButtonText, { color: theme.primary }]}>Need an account? Register first</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function OtpVerificationScreen({ navigation, route }) {
  const showToast = useToast();
  const { isDarkMode } = useApp();
  const theme = useTheme();
  const { setUser, setPickupHistory } = useApp();
  const phone = route.params?.phone || '';
  const role = route.params?.role || 'customer';
  const firebasePhone = route.params?.firebasePhone || '';
  const initialVerificationId = route.params?.verificationId || '';
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(initialVerificationId);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const recaptchaVerifier = useRef(null);

  const onVerify = async () => {
    if (otp.trim().length !== 6) {
      showToast('Enter the 6-digit OTP sent by Firebase.', 'error');
      return;
    }

    if (!verificationId) {
      showToast('Please request a new OTP before trying again.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, otp.trim());
      const firebaseUser = await firebaseAuth.signInWithCredential(credential);
      const verifiedDigits = normalizePhoneDigits(firebaseUser.user?.phoneNumber || phone);
      const response = await verifyRoleAccount(verifiedDigits, role);
      const persistedPickups = await loadPickupHistoryForUser(response.data?._id);

      setUser((prev) => ({
        ...prev,
        ...response.data,
        availabilityStatus: prev.availabilityStatus || 'available'
      }));
      setPickupHistory(persistedPickups);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });
    } catch (error) {
      showToast(getFirebaseAuthErrorMessage(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    try {
      setResending(true);
      await verifyRoleAccount(phone, role);

      const phoneProvider = new firebase.auth.PhoneAuthProvider();
      const nextVerificationId = await phoneProvider.verifyPhoneNumber(firebasePhone, recaptchaVerifier.current);

      setVerificationId(nextVerificationId);
      showToast(`OTP resent to ${firebasePhone}`);
    } catch (error) {
      showToast(getFirebaseAuthErrorMessage(error), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={[styles.authCard, styles.glassCard, isDarkMode && { backgroundColor: 'rgba(10, 40, 35, 0.98)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <ScreenHeader
            title="Verify OTP"
            subtitle={`Enter the OTP sent to ${firebasePhone || phone}`}
            centered
            compact
          />

          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="Your mobile number"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            maxLength={15}
          />

          <Text style={[styles.label, { color: theme.text }]}>OTP Code</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="6-digit OTP"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            maxLength={6}
          />

          <View style={styles.otpHintCard}>
            <Text style={styles.otpHintLabel}>Firebase OTP</Text>
            <Text style={styles.otpHintValue}>{firebasePhone || 'Phone not available'}</Text>
            <Text style={styles.otpHintText}>
              If the SMS does not arrive, confirm Phone Authentication is enabled and resend the code.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={onVerify}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Verifying...' : 'Verify and Continue'}</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, resending && styles.buttonDisabled]}
            onPress={onResend}
            disabled={resending}
          >
            <Text style={styles.secondaryButtonText}>{resending ? 'Resending...' : 'Resend OTP'}</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={() => navigation.replace('Login', { phone, role })}>
            <Text style={styles.textButtonText}>Change phone number</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function HomeScreen({ navigation }) {
  const [refreshNow, setRefreshNow] = useState(Date.now());
  const { pickupHistory, user, isDarkMode } = useApp();
  const theme = useTheme();
  const latestPickup = pickupHistory[0];
  const tracking = getPickupTracking(latestPickup, refreshNow);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRefreshNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const featureCards = [
    {
      icon: 'shield-check-outline',
      title: 'Certified Recycling',
      text: 'Every item is processed with industrial-grade sustainability standards and zero landfill waste.'
    },
    {
      icon: 'chart-line-variant',
      title: 'Track Your Impact',
      text: 'Monitor your contribution to CO2 reduction and raw material recovery in real-time.'
    }
  ];

  const impactStats = [
    { label: 'Recycled', value: '100,000 Kg+', icon: 'recycle', color: '#4CAF50' },
    { label: 'CO2 Saved', value: '200,000 Kg+', icon: 'molecule-co2', color: '#00BCD4' },
    { label: 'People Aware', value: '100,000+', icon: 'human-child', color: '#FFC107' }
  ];

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: 0, paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        {/* Crazy Hero Section */}
        <View style={[styles.homeHeroCard, { padding: 0, overflow: 'hidden', backgroundColor: 'transparent', marginTop: -10 }]}>
          <ImageBackground 
            source={{ uri: 'file:///home/harshbamane/.gemini/antigravity/brain/af036239-4278-4d52-8a58-0a1ecf05fcc0/greenbyte_hero_illustration_1777356963133.png' }}
            style={{ width: '100%', height: 260, justifyContent: 'center' }}
            imageStyle={{ borderRadius: 24, opacity: isDarkMode ? 0.8 : 1 }}
          >
            <LinearGradient
              colors={['transparent', isDarkMode ? 'rgba(5, 31, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)']}
              style={{ padding: 22, paddingTop: 60 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={[styles.homeLogoBadge, { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <MaterialCommunityIcons name="leaf" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.homeHeroEyebrow, { marginBottom: 0 }]}>GREENBYTE - Powered by Pruthvi Zero Waste</Text>
              </View>
              <Text style={[styles.homeHeroTitle, { color: theme.text, fontSize: 32, lineHeight: 38 }]}>
                Local Action{'\n'}Global Impact.
              </Text>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Impact Stats Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {impactStats.map(stat => (
            <View key={stat.label} style={[styles.glassCardCompact, { flex: 1, padding: 12, alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)' }]}>
              <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, marginTop: 4 }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, color: theme.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.homeHeroText, { color: theme.muted, fontSize: 15, lineHeight: 22 }]}>
            Welcome back, <Text style={{ color: theme.primary, fontWeight: '700' }}>{user?.name || 'Eco Warrior'}</Text>. 
            Your sustainable journey continues. Drop off your e-waste at authorized hubs and track your environmental impact in real-time.
          </Text>
        </View>

        <Pressable 
          style={[styles.primaryButton, { height: 60, justifyContent: 'center', shadowColor: theme.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, marginBottom: 24 }]} 
          onPress={() => navigation.getParent()?.navigate('SelectEWaste')}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12 }}
          />
          <Text style={[styles.primaryButtonText, { fontSize: 18, fontWeight: '800' }]}>Drop-off E-Waste</Text>
        </Pressable>

          <View style={[styles.homeFeatureList, { marginTop: 10 }]}>
            {featureCards.map((feature) => (
              <View key={feature.title} style={[styles.homeFeatureCard, styles.glassCardCompact, { marginBottom: 12, padding: 16, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }]}>
                <View style={[styles.homeFeatureIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0FAF5' }]}>
                  <MaterialCommunityIcons name={feature.icon} size={24} color={theme.primary} />
                </View>
                <View style={styles.homeFeatureCopy}>
                  <Text style={[styles.homeFeatureTitle, { color: theme.text, fontSize: 16 }]}>{feature.title}</Text>
                  <Text style={[styles.homeFeatureText, { color: theme.muted, fontSize: 13 }]}>{feature.text}</Text>
                </View>
              </View>
            ))}
          </View>

        {latestPickup ? (
          <Pressable
            style={[styles.trackingHeroCard, styles.glassCard, { marginTop: 0, marginBottom: 20, backgroundColor: isDarkMode ? 'rgba(20, 80, 70, 0.3)' : '#F0FAF5', borderLeftWidth: 4, borderLeftColor: theme.primary }]}
            onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: latestPickup.id })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="radar" size={18} color="#FFF" />
                </View>
                <Text style={{ fontWeight: '800', color: theme.text, fontSize: 16 }}>Live Tracking</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.statusPillText, { color: theme.primary }]}>
                  {tracking.currentStep.title}
                </Text>
              </View>
            </View>
            
            <View style={{ gap: 4, marginBottom: 14 }}>
              <Text style={{ color: theme.muted, fontSize: 13 }}>Scheduled for: {latestPickup.pickupDetails?.date || '-'}</Text>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{tracking.etaText}</Text>
            </View>

            <View style={{ height: 4, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ width: `${((tracking.activeStep + 1) / TRACKING_STEPS.length) * 100}%`, height: '100%', backgroundColor: theme.primary }} />
            </View>
          </Pressable>
        ) : null}

      </ScrollView>
    </ScreenShell>
  );
}

function SelectEWasteScreen({ navigation }) {
  const { selectedItems, setSelectedItems, isDarkMode } = useApp();
  const theme = useTheme();
  const categories = Object.keys(PRICE_CATALOG);

  const [category, setCategory] = useState(categories[0]);
  const [itemName, setItemName] = useState(PRICE_CATALOG[categories[0]][0].name);
  const [quantity, setQuantity] = useState('1');
  const [weightKg, setWeightKg] = useState('');
  const [condition, setCondition] = useState('');
  const [yearOfManufacturing, setYearOfManufacturing] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
        console.log('Image captured as base64');
      } else {
        setPhotoUri(asset.uri);
        console.log('Image captured as URI:', asset.uri);
      }
    }
  };

  const itemOptions = PRICE_CATALOG[category];
  const selectedMeta = itemOptions.find((x) => x.name === itemName);

  const onCategoryChange = (next) => {
    setCategory(next);
    setItemName(PRICE_CATALOG[next][0].name);
  };

  const resetForm = () => {
    setQuantity('1');
    setWeightKg('');
    setCondition('');
    setYearOfManufacturing('');
    setPhotoUri('');
    setEditingId(null);
    setFormError('');
  };

  const onAddOrUpdate = () => {
    setFormError('');
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      setFormError('Quantity must be at least 1.');
      return;
    }

    let weight = 0;
    if (selectedMeta.unit === 'kg') {
      weight = Number(weightKg);
      if (!Number.isFinite(weight) || weight <= 0) {
        setFormError('Enter weight in kg for this item.');
        return;
      }
    }

    const nextItem = {
      id: editingId || `${Date.now()}`,
      category,
      name: selectedMeta.name,
      unit: selectedMeta.unit,
      price: selectedMeta.price,
      quantity: qty,
      weightKg: selectedMeta.unit === 'kg' ? weight : 0,
      condition,
      yearOfManufacturing: parseInt(yearOfManufacturing, 10) || null,
      photoUri
    };

    if (editingId) {
      setSelectedItems((prev) => prev.map((x) => (x.id === editingId ? nextItem : x)));
    } else {
      setSelectedItems((prev) => [...prev, nextItem]);
    }

    resetForm();
  };

  const onEdit = (item) => {
    setCategory(item.category);
    setItemName(item.name);
    setQuantity(String(item.quantity));
    setWeightKg(item.unit === 'kg' ? String(item.weightKg) : '');
    setCondition(item.condition || 'working');
    setYearOfManufacturing(item.yearOfManufacturing ? String(item.yearOfManufacturing) : '');
    setPhotoUri(item.photoUri || '');
    setEditingId(item.id);
  };

  const onRemove = (id) => {
    setSelectedItems((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const total = selectedItems.reduce((sum, item) => sum + computeItemEstimate(item), 0);

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: 100 }]}>

        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
        <View style={styles.chipsRow}>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.chip, 
                category === c && styles.chipActive,
                isDarkMode && category !== c && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => onCategoryChange(c)}
            >
              <Text style={[
                styles.chipText, 
                category === c && styles.chipTextActive,
                isDarkMode && category !== c && { color: theme.muted }
              ]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Item</Text>
        <View style={styles.chipsRow}>
          {itemOptions.map((it) => (
            <Pressable
              key={it.name}
              style={[
                styles.chip, 
                itemName === it.name && styles.chipActive,
                isDarkMode && itemName !== it.name && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => setItemName(it.name)}
            >
              <Text style={[
                styles.chipText, 
                itemName === it.name && styles.chipTextActive,
                isDarkMode && itemName !== it.name && { color: theme.muted }
              ]}>
                {it.name} ({it.price}/{it.unit})
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0,0,0,0.3)', color: theme.text, borderColor: 'rgba(255,255,255,0.1)' }]}
          placeholder="e.g. 2"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : '#91A79F'}
        />

        {selectedMeta.unit === 'kg' && (
          <>
            <Text style={styles.label}>Weight (kg each)</Text>
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="e.g. 1.5"
              placeholderTextColor="#91A79F"
            />
          </>
        )}

        <View style={{ height: 10 }} />

        <Text style={[styles.label, { color: theme.text }]}>Year of Manufacturing (optional)</Text>
        <TextInput
          value={yearOfManufacturing}
          onChangeText={setYearOfManufacturing}
          keyboardType="number-pad"
          style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0,0,0,0.3)', color: theme.text, borderColor: 'rgba(255,255,255,0.1)' }]}
          placeholder="e.g. 2018"
          placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : '#91A79F'}
          maxLength={4}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Pressable style={[styles.secondaryMiniButton, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]} onPress={pickImage}>
            <Text style={[styles.secondaryMiniButtonText, isDarkMode && { color: theme.text }]}>Pick Image</Text>
          </Pressable>
          {photoUri ? (
            <View style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.primary }}>
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
            </View>
          ) : null}
          {photoUri ? <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>Ready</Text> : null}
        </View>

        {formError ? (
          <View style={{ backgroundColor: '#FFE8E5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
            <Text style={{ color: '#A13A2A', fontSize: 13, fontWeight: '600' }}>{formError}</Text>
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={onAddOrUpdate}>
          <Text style={styles.primaryButtonText}>{editingId ? 'Update Item' : 'Add Item'}</Text>
        </Pressable>

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Selected Items</Text>
          {selectedItems.length === 0 ? (
            <Text style={styles.emptyText}>No items added yet.</Text>
          ) : (
            selectedItems.map((item) => {
              const estimate = computeItemEstimate(item);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemMain}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>
                      {item.name} x {item.quantity}
                    </Text>
                    <Text style={[styles.itemMeta, { color: theme.muted }]}>
                      {item.unit === 'kg' ? `${item.weightKg} kg each` : `${item.price}/pc`} | Est. ₹{estimate}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable style={[styles.miniButton, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => onEdit(item)}>
                      <Text style={[styles.miniButtonText, isDarkMode && { color: theme.primary }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.miniButton, styles.removeBtn, isDarkMode && { backgroundColor: 'rgba(255, 82, 82, 0.15)' }]} onPress={() => onRemove(item.id)}>
                      <Text style={[styles.removeText, isDarkMode && { color: '#FFB4A9' }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.totalCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.totalText, isDarkMode && { color: theme.primary }]}>Estimated Value: {total}</Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' })}
        >
          <Text style={styles.primaryButtonText}>Continue to Schedule</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function SchedulePickupScreen({ navigation }) {
  const { user, selectedItems, pickupDetails, setPickupDetails, isDarkMode } = useApp();
  const theme = useTheme();
  const [pickupDate, setPickupDate] = useState(pickupDetails.date || '');
  const [address, setAddress] = useState(pickupDetails.address || ''); // Stores the selected drop-off point
  const [phone, setPhone] = useState(pickupDetails.phone || user?.phone || '');
  const [notes, setNotes] = useState(pickupDetails.notes || '');
  const [activePicker, setActivePicker] = useState(null);
  const [targetRecyclerId, setTargetRecyclerId] = useState(pickupDetails.targetRecyclerId || '');
  const [formError, setFormError] = useState('');
  const [recyclers, setRecyclers] = useState([]);

  React.useEffect(() => {
    apiRequest('/recyclers')
      .then(res => setRecyclers(res.data || []))
      .catch(console.error);
  }, []);

  const dropoffOptions = React.useMemo(() => {
    return recyclers.flatMap(r => {
      const name = r.companyName || r.user?.organizationName || r.user?.name || 'Recycler';
      const address = r.user?.address || 'Main Facility';
      const points = r.collectionPoints?.length ? r.collectionPoints : [address];
      
      return points.map(pt => ({
        label: pt === address ? `${name} (${pt})` : `${name} - ${pt}`,
        value: JSON.stringify({ label: `${name} - ${pt}`, id: r.user?._id })
      }));
    });
  }, [recyclers]);

  const onReview = () => {
    setFormError('');
    if (!selectedItems.length) {
      setFormError('Add e-waste items before scheduling pickup.');
      return;
    }
    if (!pickupDate || !address || !phone) {
      setFormError('Please select a date, drop-off point, and phone number.');
      return;
    }

    setPickupDetails({
      date: pickupDate,
      time: '', // No specific time required for drop-off
      mode: 'dropoff',
      address,
      phone,
      notes,
      targetRecyclerId
    });
    navigation.getParent()?.navigate('OrderSummary');
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Schedule Drop-off" subtitle="Pick a date and an authorized drop-off location." />

        <View style={[styles.glassCard, { padding: 18, marginTop: 10, backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)' }]}>
          <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Drop-off Date</Text>
          <Pressable style={[styles.pickerField, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setActivePicker('date')}>
            <MaterialCommunityIcons name="calendar-outline" size={20} color={theme.primary} />
            <Text style={[pickupDate ? styles.pickerValue : styles.pickerPlaceholder, pickupDate && isDarkMode && { color: theme.text }]}>
              {pickupDate || 'Choose date'}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: theme.text }]}>Drop-off Location</Text>
          <Pressable style={[styles.pickerField, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setActivePicker('address')}>
            <MaterialCommunityIcons name="map-marker-check-outline" size={20} color={theme.primary} />
            <Text style={[address ? styles.pickerValue : styles.pickerPlaceholder, address && isDarkMode && { color: theme.text }]} numberOfLines={1}>
              {address || 'Choose a recycler drop-off point'}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.1)' }]}
            placeholder="Mobile number"
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.text }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.1)' }]}
            placeholder="Gate number, landmark, etc."
            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : '#91A79F'}
            multiline
          />

          {formError ? (
            <View style={{ backgroundColor: isDarkMode ? 'rgba(255, 100, 100, 0.1)' : '#FFE8E5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ color: isDarkMode ? '#FF8080' : '#A13A2A', fontSize: 13, fontWeight: '600' }}>{formError}</Text>
            </View>
          ) : null}
        </View>

        <Pressable 
          style={[styles.secondaryButton, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }, { marginTop: 24 }]} 
          onPress={() => navigation.getParent()?.navigate('SelectEWaste')}
        >
          <Text style={[styles.secondaryButtonText, isDarkMode && { color: theme.text }]}>Edit E-Waste Items</Text>
        </Pressable>

        <Pressable 
          style={[styles.primaryButton, { shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }]} 
          onPress={onReview}
        >
          <Text style={styles.primaryButtonText}>Review Order</Text>
        </Pressable>

        <SelectionPickerModal
          visible={activePicker === 'date'}
          title="Select Pickup Date"
          subtitle="Choose a date from the next two weeks."
          options={DATE_OPTIONS}
          selectedValue={pickupDate}
          onClose={() => setActivePicker(null)}
          onSelect={(option) => {
            setPickupDate(option.label);
            setActivePicker(null);
          }}
        />

        <SelectionPickerModal
          visible={activePicker === 'address'}
          title="Select Drop-off Location"
          subtitle="Choose an authorized recycler drop-off point near you."
          options={dropoffOptions}
          selectedValue={address}
          onClose={() => setActivePicker(null)}
          onSelect={(option) => {
            try {
              const parsed = JSON.parse(option.value);
              setAddress(parsed.label);
              setTargetRecyclerId(parsed.id);
            } catch (e) {
              setAddress(option.value);
            }
            setActivePicker(null);
          }}
        />
      </ScrollView>
    </ScreenShell>
  );
}

function OrderSummaryScreen({ navigation }) {
  const showToast = useToast();
  const {
    user,
    selectedItems,
    pickupDetails,
    pickupHistory,
    setPickupHistory,
    setSelectedItems,
    setPickupDetails,
    isDarkMode
  } = useApp();
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [formError, setFormError] = useState('');

  const total = selectedItems.reduce((sum, item) => sum + computeItemEstimate(item), 0);

  const getAiEstimate = React.useCallback(async () => {
    try {
      setIsEstimating(true);
      setAiResult(null);
      const response = await apiRequest('/pickups/estimate', {
        method: 'POST',
        body: JSON.stringify({
          items: selectedItems.map((item) => ({
            category: item.category,
            name: item.name,
            quantity: item.quantity,
            condition: item.condition,
            yearOfManufacturing: item.yearOfManufacturing,
            ...(item.unit === 'kg' ? { weightKg: item.weightKg } : {})
          }))
        })
      });
      
      setAiResult(response.data);
    } catch (error) {
      console.error('Estimation error:', error);
    } finally {
      setIsEstimating(false);
    }
  }, [selectedItems]);

  React.useEffect(() => {
    getAiEstimate();
  }, [getAiEstimate]);

  const onConfirm = async () => {
    setFormError('');
    if (!selectedItems.length) {
      setFormError('Add items before confirming.');
      return;
    }

    if (!user?._id) {
      setFormError('Sign in again before confirming a pickup request.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiRequest('/pickups', {
        method: 'POST',
        body: JSON.stringify({
          userId: user._id,
          items: selectedItems.map((item) => {
            console.log(`Submitting item ${item.name} with photo length:`, item.photoUri?.length || 0);
            return {
              category: item.category,
              name: item.name,
              quantity: item.quantity,
              condition: item.condition || '',
              yearOfManufacturing: item.yearOfManufacturing,
              photoUri: item.photoUri || '',
              ...(item.unit === 'kg' ? { weightKg: item.weightKg } : {})
            };
          }),
          schedule: {
            dateLabel: pickupDetails.date || '',
            timeLabel: pickupDetails.time || ''
          },
          requestMode: pickupDetails.mode || 'pickup',
          address: pickupDetails.address || '',
          phone: pickupDetails.phone || user.phone || '',
          notes: pickupDetails.notes || '',
          targetRecyclerId: pickupDetails.targetRecyclerId || null
        })
      });
      const newRecord = mapBackendPickupToFrontend(response.data);

      setPickupHistory([newRecord, ...pickupHistory.filter((entry) => entry.id !== newRecord.id)]);
      setSelectedItems([]);
      setPickupDetails({});

      showToast('Pickup request submitted! Waiting for admin approval.');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: 100 }]}>

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Selected Items</Text>
          {(selectedItems || []).map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text }]}>
                {item.name} x {item.quantity}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.primary }]}>₹{computeItemEstimate(item)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalText, { color: theme.text }]}>Base Estimate</Text>
            <Text style={[styles.totalText, { color: theme.primary }]}>₹{total}</Text>
          </View>
        </View>

        {isEstimating ? (
          <View style={[styles.listCard, { alignItems: 'center', padding: 24, backgroundColor: isDarkMode ? 'rgba(20, 80, 70, 0.2)' : '#F0F7F4' }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ marginTop: 12, color: theme.primary, fontWeight: '600' }}>Calculating AI Valuation...</Text>
          </View>
        ) : aiResult ? (
          <View style={[styles.listCard, { backgroundColor: isDarkMode ? 'rgba(20, 80, 70, 0.2)' : '#F0F7F4', borderLeftWidth: 4, borderLeftColor: theme.primary, borderColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="auto-fix" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8, color: theme.text }]}>AI Scrap Estimation</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.text }]}>Final Estimated Value</Text>
              <Text style={[styles.totalText, { color: theme.primary }]}>₹{aiResult.totalEstimate}</Text>
            </View>
            
            {aiResult.estimationReasoning ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }}>
                <Text style={{ fontSize: 13, color: theme.muted, fontStyle: 'italic', lineHeight: 18 }}>
                  "{aiResult.estimationReasoning}"
                </Text>
              </View>
            ) : null}

            {aiResult.estimationReasoning?.includes('Fallback') || aiResult.estimationReasoning?.includes('error') ? (
              <Pressable 
                style={{ 
                  marginTop: 12, 
                  backgroundColor: THEME.primary, 
                  padding: 8, 
                  borderRadius: 6, 
                  alignItems: 'center' 
                }} 
                onPress={getAiEstimate}
              >
                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>Retry AI Estimation</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Drop-off Details</Text>
          <Text style={[styles.pickupText, { color: theme.text }]}>Date: {pickupDetails.date || '-'}</Text>
          <Text style={[styles.pickupText, { color: theme.text }]}>Location: {pickupDetails.address || '-'}</Text>
          <Text style={[styles.pickupText, { color: theme.text }]}>Phone: {pickupDetails.phone || '-'}</Text>
          {pickupDetails.notes ? <Text style={[styles.pickupText, { color: theme.text }]}>Notes: {pickupDetails.notes}</Text> : null}
        </View>

        {formError ? (
          <View style={{ backgroundColor: '#FFE8E5', padding: 12, borderRadius: 10, marginBottom: 14 }}>
            <Text style={{ color: '#A13A2A', fontSize: 13, fontWeight: '600' }}>{formError}</Text>
          </View>
        ) : null}

        <Pressable 
          style={[styles.primaryButton, (isSubmitting || isEstimating) && styles.buttonDisabled]} 
          onPress={onConfirm}
          disabled={isSubmitting || isEstimating}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Confirming...' : 'Confirm Pickup Request'}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function RecyclerOperationsScreen({ navigation }) {
  const showToast = useToast();
  const { user, setUser, pickupHistory, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();
  const prevStatuses = React.useRef({});
  
  const fetchRecyclerQueue = React.useCallback(async (isAutoRefresh = false) => {
    try {
      const res = await apiRequest(`/recyclers/${user._id}/requests?scope=all`);
      const newData = (res.data || []).map(mapBackendPickupToFrontend).filter(Boolean);
      
      if (isAutoRefresh) {
        // Detect status changes for assigned pickups to show notifications
        newData.forEach(pickup => {
          if (pickup.assignedRecyclerId === user._id) {
            const oldStatus = prevStatuses.current[pickup.id];
            if (oldStatus && oldStatus !== pickup.status) {
              const statusLabel = REQUEST_STATUS_META[pickup.status]?.label || pickup.status;
              showToast(`Job ${pickup.trackingId} status updated: ${statusLabel}`);
            }
            prevStatuses.current[pickup.id] = pickup.status;
          }
        });
      } else {
        // Initial load: just populate the ref
        newData.forEach(pickup => {
          if (pickup.assignedRecyclerId === user._id) {
            prevStatuses.current[pickup.id] = pickup.status;
          }
        });
      }

      setPickupHistory(newData);
    } catch (e) {
      console.error(e);
    }
  }, [user._id, setPickupHistory, showToast]);

  React.useEffect(() => {
    fetchRecyclerQueue();
    
    // Set up polling interval (every 10 seconds)
    const interval = setInterval(() => {
      fetchRecyclerQueue(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchRecyclerQueue]);

  const availabilityStatus = user.availabilityStatus || 'available';
  const openRequests = pickupHistory.filter((request) => {
    const rejectedByMe = request.recyclerDecisions?.some(
      (entry) => entry.recyclerId === user._id && entry.decision === 'rejected'
    );

    return request.status === 'price_accepted' && !request.assignedRecyclerId && !rejectedByMe;
  });

  const assignedRequests = pickupHistory.filter((request) => 
    request.assignedRecyclerId === user._id && 
    !['cancelled', 'rejected', 'completed', 'paid'].includes(request.status)
  );
  const assignedCount = assignedRequests.length;

  const onChangeAvailability = () => {
    const next =
      availabilityStatus === 'available'
        ? 'busy'
        : availabilityStatus === 'busy'
          ? 'offline'
          : 'available';

    setUser((prev) => ({ ...prev, availabilityStatus: next }));
  };

  const onAccept = async (requestId) => {
    try {
      await apiRequest(`/recyclers/${user._id}/requests/${requestId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'accept' })
      });
      setPickupHistory((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: 'assigned',
                assignedRecyclerName: user.name,
                assignedRecyclerPhone: user.phone,
                assignedRecyclerId: user._id,
                pickupPartner: {
                  name: user.name,
                  phone: user.phone
                }
              }
            : request
        )
      );
      showToast('Request accepted and assigned to you.');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const onReject = async (requestId) => {
    try {
      await apiRequest(`/recyclers/${user._id}/requests/${requestId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'reject' })
      });
      setPickupHistory((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Recycler Dashboard" subtitle="Review new requests and manage collection availability." />

        <Pressable 
          style={[styles.recyclerStatusCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]} 
          onPress={onChangeAvailability}
        >
          <View>
            <Text style={[styles.recyclerStatusLabel, { color: theme.muted }]}>AVAILABILITY</Text>
            <Text style={[styles.recyclerStatusValue, { color: theme.text }]}>{availabilityStatus.toUpperCase()}</Text>
          </View>
          <Text style={[styles.recyclerStatusLink, { color: theme.primary }]}>Tap to switch</Text>
        </Pressable>

        <View style={styles.metricGrid}>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="inbox-arrow-down-outline" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{openRequests.length}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Open requests</Text>
          </View>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="truck-check-outline" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{assignedCount}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Assigned to you</Text>
          </View>
        </View>

        {assignedRequests.length > 0 && (
          <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            
            {assignedRequests.slice(0, 2).map((request) => {
              const statusMeta = REQUEST_STATUS_META[request.status] || { label: 'Assigned', tone: 'active' };
              return (
                <Pressable 
                  key={request.id} 
                  style={[styles.requestCard, isDarkMode && { borderBottomColor: 'rgba(255,255,255,0.05)' }]}
                  onPress={() => navigation.navigate('Assigned')}
                >
                  <View style={styles.requestCardHeader}>
                    <View>
                      <Text style={[styles.requestCardTitle, { color: theme.text }]}>{request.trackingId}</Text>
                      <Text style={[styles.requestCardMeta, { color: theme.muted }]}>
                        {request.items.length} items | Value ₹{request.totalEstimate || 0}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      statusMeta.tone === 'warning' ? styles.statusBadgeWarning : styles.statusBadgeActive
                    ]}>
                      <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.requestDetailLine, { color: theme.text }]}>Location: {request.pickupDetails?.address || '-'}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>New Collection Requests</Text>
          {!openRequests.length ? (
            <Text style={styles.emptyText}>No new requests are waiting right now.</Text>
          ) : (
            openRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={[styles.requestCardTitle, isDarkMode && { color: theme.text }]}>
                      {request.requestMode === 'dropoff' ? 'Drop-off Request' : 'Pickup Request'}
                    </Text>
                    <Text style={[styles.requestCardMeta, isDarkMode && { color: theme.muted }]}>
                      {request.items.length} items | Value ₹{request.totalEstimate || 0}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                    <Text style={styles.statusBadgeText}>New</Text>
                  </View>
                </View>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Customer: {request.customerName || '-'}</Text>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Date: {request.pickupDetails?.date || '-'}</Text>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Location: {request.pickupDetails?.address || '-'}</Text>
                <View style={styles.requestActionRow}>
                  <Pressable 
                    style={[styles.secondaryMiniButton, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]} 
                    onPress={() => onReject(request.id)}
                  >
                    <Text style={[styles.secondaryMiniButtonText, isDarkMode && { color: theme.text }]}>Reject</Text>
                  </Pressable>
                  <Pressable style={styles.primaryMiniButton} onPress={() => onAccept(request.id)}>
                    <Text style={styles.primaryMiniButtonText}>Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function RecyclerAssignedScreen({ navigation }) {
  const showToast = useToast();
  const { user, pickupHistory, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();
  const assignedRequests = pickupHistory.filter(
    (request) => request.assignedRecyclerId === user._id && !['cancelled', 'rejected'].includes(request.status)
  );

  const onAdvance = async (requestId, currentStatus) => {
    const nextStatus = {
      assigned: 'collected',
      collected: 'in_transit'
    }[currentStatus];

    if (!nextStatus) return;

    try {
      await apiRequest(`/recyclers/${user._id}/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      
      setPickupHistory((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: nextStatus } : request
        )
      );
      showToast(`Status advanced to ${nextStatus}`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Assigned Jobs" subtitle="Move accepted requests through the collection workflow." />

        {!assignedRequests.length ? (
          <View style={styles.listCard}>
            <Text style={styles.emptyText}>You have not accepted any collection requests yet.</Text>
          </View>
        ) : (
          assignedRequests.map((request) => {
            const statusMeta = getRequestStatusMeta(request.status);
            const actionText = getButtonLabel(request.status);

            return (
              <View key={request.id} style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={[styles.requestCardTitle, { color: theme.text }]}>{request.trackingId}</Text>
                    <Text style={[styles.requestCardMeta, { color: theme.muted }]}>{request.items.length} items | ₹{request.totalEstimate || 0}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      statusMeta.tone === 'success'
                        ? styles.statusBadgeSuccess
                        : statusMeta.tone === 'warning'
                          ? styles.statusBadgeWarning
                          : styles.statusBadgeActive
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
                  </View>
                </View>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Customer: {request.customerName} ({request.pickupDetails?.phone || '-'})</Text>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Address: {request.pickupDetails?.address || '-'}</Text>
                {actionText ? (
                  <Pressable style={styles.primaryButton} onPress={() => onAdvance(request.id, request.status)}>
                    <Text style={styles.primaryButtonText}>{actionText}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: request.id })}
                  >
                    <Text style={styles.secondaryButtonText}>View Tracking View</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function AdminOverviewScreen({ navigation }) {
  const { pickupHistory, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();

  React.useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await apiRequest('/admin/requests');
        setPickupHistory((res.data || []).map(mapBackendPickupToFrontend).filter(Boolean));
      } catch (e) {
        console.error(e);
      }
    };
    fetchAdmin();
  }, [setPickupHistory]);

  const totalValue = pickupHistory.reduce((sum, request) => sum + (request.totalEstimate || 0), 0);
  const completedCount = pickupHistory.filter((request) => request.status === 'completed').length;
  const inProgressCount = pickupHistory.filter((request) =>
    ['assigned', 'in_transit', 'collected', 'recycled'].includes(request.status)
  ).length;

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Admin Overview" subtitle="Monitor marketplace activity, collection flow, and sustainability outcomes." />

        <View style={styles.metricGrid}>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{pickupHistory.length}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Total requests</Text>
          </View>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="truck-fast-outline" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{inProgressCount}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>In progress</Text>
          </View>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="recycle" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{completedCount}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Completed</Text>
          </View>
          <View style={[styles.metricCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="currency-inr" size={24} color={theme.primary} />
            <Text style={[styles.metricValue, { color: theme.text }]}>{totalValue}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>Quoted value</Text>
          </View>
        </View>

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(10, 40, 35, 0.98)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Platform Activity</Text>
          {!pickupHistory.length ? (
            <Text style={[styles.emptyText, { color: theme.muted }]}>No requests have been created yet.</Text>
          ) : (
            pickupHistory.slice(0, 5).map((request) => {
              const statusMeta = getRequestStatusMeta(request.status);
              return (
                <Pressable 
                  key={request.id} 
                  style={[styles.adminActivityRow, isDarkMode && { borderBottomColor: 'rgba(255,255,255,0.05)' }]}
                  onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: request.id })}
                >
                  <View style={styles.adminActivityText}>
                    <Text style={[styles.requestCardTitle, { color: theme.text }]}>{request.trackingId || request.id}</Text>
                    <Text style={[styles.requestCardMeta, { color: theme.muted }]}>
                      {request.requestMode === 'dropoff' ? 'Drop-off' : 'Pickup'} | {request.items.length} items
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      statusMeta.tone === 'success'
                        ? styles.statusBadgeSuccess
                        : statusMeta.tone === 'warning'
                          ? styles.statusBadgeWarning
                          : statusMeta.tone === 'danger'
                            ? styles.statusBadgeDanger
                            : statusMeta.tone === 'active'
                              ? styles.statusBadgeActive
                              : styles.statusBadgeNeutral
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function AdminRequestsScreen({ navigation }) {
  const { pickupHistory, isDarkMode } = useApp();
  const theme = useTheme();

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Request Management" subtitle="Review every request, assigned recycler, and lifecycle stage." />

        {!pickupHistory.length ? (
          <View style={styles.listCard}>
            <Text style={styles.emptyText}>There are no requests in the system yet.</Text>
          </View>
        ) : (
          pickupHistory.map((request) => {
            const statusMeta = getRequestStatusMeta(request.status);
            return (
              <Pressable
                key={request.id}
                style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: request.id })}
              >
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={[styles.requestCardTitle, isDarkMode && { color: theme.text }]}>{request.trackingId || request.id}</Text>
                    <Text style={[styles.requestCardMeta, isDarkMode && { color: theme.muted }]}>
                      {request.pickupDetails?.date || '-'} | ₹{request.totalEstimate || 0}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      statusMeta.tone === 'success'
                        ? styles.statusBadgeSuccess
                        : statusMeta.tone === 'warning'
                          ? styles.statusBadgeWarning
                          : statusMeta.tone === 'danger'
                            ? styles.statusBadgeDanger
                            : statusMeta.tone === 'active'
                              ? styles.statusBadgeActive
                              : statusMeta.tone === 'neutral'
                                ? styles.statusBadgeNeutral
                                : styles.statusBadgeNeutral
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
                  </View>
                </View>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Mode: {request.requestMode === 'dropoff' ? 'Drop-off' : 'Doorstep Pickup'}</Text>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>Customer: {request.customerName} ({request.pickupDetails?.phone || '-'})</Text>
                <Text style={[styles.requestDetailLine, { color: theme.text }]}>
                  Recycler: {request.assignedRecyclerName || request.pickupPartner?.name || 'Not assigned'}
                </Text>
                <Text style={[styles.historyLink, { color: theme.primary }]}>Tap to inspect tracking view</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function TrackPickupScreen({ navigation, route }) {
  const [refreshNow, setRefreshNow] = useState(Date.now());
  const showToast = useToast();
  const { user, pickupHistory, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();
  const pickupId = route.params?.pickupId;
  const pickup = pickupId ? pickupHistory.find((entry) => entry.id === pickupId) : pickupHistory[0];
  const tracking = getPickupTracking(pickup, refreshNow);
  const assignedPartner = pickup?.pickupPartner || createPickupPartner(pickup?.id || Date.now());
  const ASSIGNED_STATUSES = ['assigned', 'in_transit', 'collected', 'recycled', 'paid', 'completed'];
  const showPartnerDetails = Boolean(pickup && ASSIGNED_STATUSES.includes(pickup.status));
  const [adminRecyclers, setAdminRecyclers] = useState([]);
  const [showRecyclerModal, setShowRecyclerModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Refetch the pickup data from the backend after any mutation
  const refetchPickup = React.useCallback(async () => {
    try {
      if (user?.role === 'admin') {
        const res = await apiRequest('/admin/requests');
        setPickupHistory((res.data || []).map(mapBackendPickupToFrontend).filter(Boolean));
      } else if (user?.role === 'customer' && user?._id) {
        const res = await apiRequest(`/pickups?userId=${user._id}`);
        setPickupHistory((res.data || []).map(mapBackendPickupToFrontend).filter(Boolean));
      } else if (user?.role === 'recycler' && user?._id) {
        const res = await apiRequest(`/recyclers/${user._id}/queue?scope=open`);
        setPickupHistory((res.data || []).map(mapBackendPickupToFrontend).filter(Boolean));
      }
    } catch (e) {
      console.error('refetchPickup error', e);
    }
    setRefreshNow(Date.now());
  }, [user, setPickupHistory]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRefreshNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (user?.role === 'admin' && pickup?.status === 'price_accepted') {
      apiRequest('/admin/recyclers').then(res => {
        if (res.success && res.data) {
          setAdminRecyclers(
            res.data
              .filter(r => r.user)
              .map(r => ({
                label: `${r.user.name} (${r.user.phone})${r.companyName ? ' – ' + r.companyName : ''}`,
                value: r.user._id
              }))
          );
        }
      }).catch(e => console.error('Failed to load recyclers', e));
    }
  }, [user.role, pickup?.status]);

  if (!pickup || !tracking) {
    return (
      <ScreenShell>
        <View style={styles.containerFlex}>
          <View style={styles.authCard}>
            <ScreenHeader
              title="Track Pickup"
              subtitle="Your active pickup will appear here once you schedule one."
              centered
              compact
            />
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SelectEWaste')}
            >
              <Text style={styles.primaryButtonText}>Schedule a Pickup</Text>
            </Pressable>
          </View>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: 100 }]}>

        <View
          style={[
            styles.trackingSummaryCard,
            isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
            tracking.activeStep === -1 && { backgroundColor: '#B3261E', borderColor: '#8C1D18' }
          ]}
        >
          <View style={styles.trackingSummaryTop}>
            <View>
              <Text style={styles.trackingCodeLabel}>Tracking ID</Text>
              <Text style={styles.trackingCodeValue}>{pickup.trackingId || `GB-${pickup.id.slice(-6)}`}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{tracking.currentStep.title}</Text>
            </View>
          </View>

          <Text style={styles.trackingEtaLabel}>Current update</Text>
          <Text style={styles.trackingEtaValue}>{tracking.etaText}</Text>

          <View style={styles.trackingInfoGrid}>
            <View style={[styles.trackingInfoCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={[styles.trackingInfoLabel, isDarkMode && { color: theme.muted }]}>Drop-off date</Text>
              <Text style={[styles.trackingInfoValue, isDarkMode && { color: theme.text }]}>
                {pickup.pickupDetails?.date || '-'}
              </Text>
            </View>
            <View style={[styles.trackingInfoCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={[styles.trackingInfoLabel, isDarkMode && { color: theme.muted }]}>Request mode</Text>
              <Text style={[styles.trackingInfoValue, isDarkMode && { color: theme.text }]}>Drop-off</Text>
            </View>
            <View style={[styles.trackingInfoCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}>
              <Text style={[styles.trackingInfoLabel, isDarkMode && { color: theme.muted }]}>Estimated value</Text>
              <Text style={[styles.trackingInfoValue, isDarkMode && { color: theme.text }]}>
                ₹{pickup.totalEstimate || 0}
              </Text>
            </View>
          </View>

          <View style={[styles.trackingAddressCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={theme.primary} />
            <View style={styles.trackingAddressBody}>
              <Text style={[styles.trackingAddressLabel, isDarkMode && { color: theme.muted }]}>Drop-off Location</Text>
              <Text style={[styles.trackingAddressValue, isDarkMode && { color: theme.text }]}>{pickup.pickupDetails?.address || '-'}</Text>
            </View>
          </View>

          {pickup.estimationReasoning ? (
            <View style={[styles.trackingAddressCard, { marginTop: 12, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F7F4', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'transparent' }]}>
              <MaterialCommunityIcons name="auto-fix" size={20} color={theme.primary} />
              <View style={styles.trackingAddressBody}>
                <Text style={[styles.trackingAddressLabel, isDarkMode && { color: theme.muted }]}>AI Valuation Insight</Text>
                <Text style={[styles.trackingAddressValue, isDarkMode && { color: theme.text, opacity: 0.8 }]}>{pickup.estimationReasoning}</Text>
              </View>
            </View>
          ) : null}

          {/* Items & Photos Section */}
          <View style={[styles.trackingAddressCard, { marginTop: 12, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF', flexDirection: 'column', alignItems: 'stretch' }]}>
            <Text style={[styles.trackingAddressLabel, { marginBottom: 12, color: theme.text, fontWeight: '700' }]}>Items & Photos</Text>
            {(pickup.items || []).map((item, idx) => (
              <View key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: idx < pickup.items.length - 1 ? 1 : 0, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>{item.name} x {item.quantity}</Text>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{computeItemEstimate(item)}</Text>
                </View>
                {item.photoUri ? (
                  <Pressable 
                    onPress={() => setSelectedImage(item.photoUri)}
                    style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 180, backgroundColor: isDarkMode ? '#000' : '#F5F5F5' }}
                  >
                    <Image 
                      source={{ uri: item.photoUri }} 
                      style={{ width: '100%', height: '100%' }} 
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : (
                  <View style={{ marginTop: 8, padding: 12, borderRadius: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#F9F9F9', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="image-off-outline" size={24} color={theme.muted} />
                    <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>No photo uploaded</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {pickup.status !== 'cancelled' && pickup.status !== 'rejected' && user?.role !== 'admin' && (
          <Pressable 
            style={[
              styles.secondaryButton, 
              { marginTop: 24, borderColor: '#FFB4A9' },
              isDarkMode && { backgroundColor: 'rgba(255, 82, 82, 0.05)', borderColor: 'rgba(255, 82, 82, 0.3)' }
            ]}
            onPress={async () => {
              const confirmed = window.confirm('Are you sure you want to cancel this pickup?');
              if (!confirmed) return;
              try {
                await apiRequest(`/pickups/${pickup.id}`, { method: 'DELETE' });
                const refreshed = pickupHistory.filter(p => p.id !== pickup.id);
                setPickupHistory(refreshed);
                showToast('Your pickup request has been removed.');
                navigation.goBack();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          >
            <Text style={[styles.secondaryButtonText, { color: '#A13A2A' }]}>Cancel Pickup Request</Text>
          </Pressable>
        )}

        {user?.role === 'admin' && (
          <Pressable 
            style={[styles.secondaryButton, { marginTop: 24, borderColor: '#D32F2F', backgroundColor: '#FFF5F5' }]}
            onPress={async () => {
              const confirmed = window.confirm('This will permanently delete this request. Are you sure?');
              if (!confirmed) return;
              try {
                await apiRequest(`/admin/requests/${pickup.id}`, { method: 'DELETE' });
                const refreshed = pickupHistory.filter(p => p.id !== pickup.id);
                setPickupHistory(refreshed);
                showToast('Request permanently removed.');
                navigation.goBack();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          >
            <Text style={[styles.secondaryButtonText, { color: '#D32F2F' }]}>Delete Request (Admin)</Text>
          </Pressable>
        )}

        {user.role === 'admin' && pickup.status === 'estimated' && (
          <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Admin Controls</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                try {
                  await apiRequest(`/admin/requests/${pickup.id}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({ finalPrice: pickup.totalEstimate })
                  });
                  await refetchPickup();
                  showToast('Price approved.');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Approve AI Price (₹{pickup.totalEstimate})</Text>
            </Pressable>
            
            <Pressable
              style={[styles.secondaryButton, { marginTop: 12 }]}
              onPress={async () => {
                const priceText = Platform.OS === 'web'
                  ? window.prompt('Enter the new proposed price in ₹:', String(pickup.totalEstimate))
                  : await new Promise((resolve) => {
                      Alert.prompt('Negotiate Price', 'Enter the new proposed price in ₹:', resolve, 'plain-text', String(pickup.totalEstimate));
                    });
                if (!priceText) return;
                const finalPrice = parseFloat(priceText);
                if (isNaN(finalPrice)) return showToast('Invalid price', 'error');
                try {
                  await apiRequest(`/admin/requests/${pickup.id}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({ finalPrice, isNegotiation: true })
                  });
                  await refetchPickup();
                  showToast('Negotiation sent to user.');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Negotiate New Price</Text>
            </Pressable>
          </View>
        )}

        {user.role === 'admin' && pickup.status === 'price_accepted' && !pickup.assignedRecyclerId && (
          <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Admin Assignment</Text>
            <Text style={[styles.summaryLabel, isDarkMode && { color: '#B0C4BE' }]}>Price is accepted. Please assign a recycler to process this request.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setShowRecyclerModal(true)}
            >
              <Text style={styles.primaryButtonText}>Assign Recycler</Text>
            </Pressable>
          </View>
        )}

        {user.role === 'admin' && pickup.status === 'recycled' && (
          <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.cardTitle, isDarkMode && { color: '#FFFFFF' }]}>Payment Processing</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                try {
                  await apiRequest(`/admin/requests/${pickup.id}/pay`, {
                    method: 'POST',
                    body: JSON.stringify({ adminId: user._id })
                  });
                  await refetchPickup();
                  showToast('Payment processed.');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Process Payment</Text>
            </Pressable>
          </View>
        )}

        {user.role === 'admin' && pickup.status === 'in_transit' && (
          <View style={styles.listCard}>
            <Text style={styles.cardTitle}>Warehouse Control</Text>
            <Text style={styles.summaryLabel}>Waste has been sent to the facility. Verify and mark as recycled.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                try {
                  await apiRequest(`/admin/requests/${pickup.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'recycled' })
                  });
                  await refetchPickup();
                  showToast('Request marked as Recycled.');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Mark as Recycled</Text>
            </Pressable>
          </View>
        )}

        {user?.role === 'recycler' && (pickup.status === 'assigned' || pickup.status === 'collected') && (
          <View style={styles.listCard}>
            <Text style={styles.cardTitle}>Recycler Actions</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={async () => {
                const currentStatus = pickup.status;
                const nextStatus = {
                  assigned: 'collected',
                  collected: 'in_transit'
                }[currentStatus];
                
                if (!nextStatus) return;

                try {
                  await apiRequest(`/recyclers/${user?._id}/requests/${pickup.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: nextStatus })
                  });
                  await refetchPickup();
                  showToast(`Status advanced to ${nextStatus}`);
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>{getButtonLabel(pickup.status)}</Text>
            </Pressable>
          </View>
        )}

        {user?.role === 'customer' && pickup.status === 'admin_negotiated' && (
          <View style={styles.listCard}>
            <Text style={styles.cardTitle}>Price Negotiation</Text>
            <Text style={styles.summaryLabel}>Admin has proposed a new price: ₹{pickup.pricing?.negotiatedAmount}</Text>
            
            <Pressable
              style={[styles.primaryButton, { marginTop: 16 }]}
              onPress={async () => {
                try {
                  await apiRequest(`/pickups/${pickup.id}/negotiation`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: user._id, accept: true })
                  });
                  await refetchPickup();
                  showToast('Price accepted! Your request is confirmed and assigned to the recycler.', 'success');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Accept New Price</Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, { marginTop: 12, borderColor: '#A13A2A' }]}
              onPress={async () => {
                try {
                  await apiRequest(`/pickups/${pickup.id}/negotiation`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: user._id, accept: false })
                  });
                  await refetchPickup();
                  showToast('Your request has been cancelled.');
                } catch (e) {
                  showToast(e.message, 'error');
                }
              }}
            >
              <Text style={[styles.secondaryButtonText, { color: '#A13A2A' }]}>Decline & Cancel Request</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.timelineCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, isDarkMode && { color: theme.text }]}>Progress Timeline</Text>
          {TRACKING_STEPS.map((step, index) => {
            const isComplete = index < tracking.activeStep;
            const isActive = index === tracking.activeStep;
            const isLast = index === TRACKING_STEPS.length - 1;

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      isComplete && styles.timelineDotComplete,
                      isActive && styles.timelineDotActive,
                      isDarkMode && !isActive && !isComplete && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isComplete ? 'check' : step.icon}
                      size={isComplete ? 14 : 16}
                      color={isComplete || isActive ? '#FFFFFF' : (isDarkMode ? theme.primary : THEME.primary)}
                    />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        styles.timelineLine,
                        index < tracking.activeStep && styles.timelineLineComplete,
                        isDarkMode && index >= tracking.activeStep && { backgroundColor: 'rgba(255,255,255,0.1)' }
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineTitle, 
                    (isActive || isComplete) && styles.timelineTitleActive,
                    isDarkMode && !isActive && !isComplete && { color: theme.muted },
                    isDarkMode && (isActive || isComplete) && { color: theme.primary }
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.timelineSubtitle, isDarkMode && { color: theme.muted }]}>{step.subtitle}</Text>
                  <Text style={[styles.timelineDescription, isDarkMode && { color: theme.text }]}>
                    {step.key === 'onTheWay' ? `${step.description}\nLocation: ${pickup.pickupDetails?.address || '-'}` : step.description}
                  </Text>
                  {isActive ? <Text style={styles.timelineTag}>Current step</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, isDarkMode && { color: theme.text }]}>Pickup Summary</Text>
          {pickup.items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, isDarkMode && { color: theme.muted }]}>
                {item.name} x {item.quantity}
              </Text>
              <Text style={[styles.summaryValue, isDarkMode && { color: theme.primary }]}>₹{computeItemEstimate(item)}</Text>
            </View>
          ))}
          <View style={[styles.summaryDivider, isDarkMode && { borderTopColor: 'rgba(255,255,255,0.1)' }]} />
          <Text style={[styles.pickupText, isDarkMode && { color: theme.muted }]}>Booked on: {pickup.createdAt}</Text>
          <Text style={[styles.pickupText, isDarkMode && { color: theme.muted }]}>Phone: {pickup.pickupDetails?.phone || '-'}</Text>
          {pickup.pickupDetails?.notes ? <Text style={[styles.pickupText, isDarkMode && { color: theme.muted }]}>Notes: {pickup.pickupDetails.notes}</Text> : null}
        </View>


        <Pressable style={[styles.secondaryButton, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}>
          <Text style={[styles.secondaryButtonText, isDarkMode && { color: theme.text }]}>View Pickup History</Text>
        </Pressable>

        <SelectionPickerModal
          visible={showRecyclerModal}
          title="Assign Recycler"
          subtitle="Select a recycler for this pickup request."
          options={adminRecyclers.length ? adminRecyclers : [{ label: 'No recyclers found', value: '' }]}
          selectedValue={null}
          onClose={() => setShowRecyclerModal(false)}
          onSelect={async (option) => {
            if (!option.value) return;
            setShowRecyclerModal(false);
            try {
              await apiRequest(`/admin/requests/${pickup.id}/assign`, {
                method: 'POST',
                body: JSON.stringify({ recyclerId: option.value, adminId: user._id })
              });
              await refetchPickup();
              showToast(`Request assigned to ${option.label.split('(')[0].trim()}.`);
            } catch (e) {
              showToast(e.message, 'error');
            }
          }}
        />
        <FullscreenImageModal
          visible={!!selectedImage}
          imageUri={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      </ScrollView>
    </ScreenShell>
  );
}

function ProfileScreen({ navigation }) {
  const showToast = useToast();
  const { user, setUser, pickupHistory, setPickupHistory, isDarkMode } = useApp();
  const theme = useTheme();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);

  const [saving, setSaving] = useState(false);
  
  const onSave = async () => {
    try {
      setSaving(true);
      const res = await apiRequest(`/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, phone, address })
      });
      setUser(res.data);
      showToast('Profile updated persistently.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    setUser({
      name: 'GreenByte User',
      role: 'customer',
      phone: '',
      address: '',
      availabilityStatus: 'available'
    });
    setPickupHistory([]);
    navigation.getParent()?.replace('Login');
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Profile" subtitle="Manage your account and history." />

        <View style={[styles.roleBanner, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.roleBannerLabel, { color: theme.muted }]}>Logged in as</Text>
          <Text style={[styles.roleBannerValue, { color: theme.primary }]}>{user.role}</Text>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={[styles.input, { color: theme.text }, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]} />

        <Text style={[styles.label, { color: theme.text }]}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={[styles.input, { color: theme.text }, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]} keyboardType="phone-pad" />

        <Text style={[styles.label, { color: theme.text }]}>Address</Text>
        <TextInput value={address} onChangeText={setAddress} style={[styles.input, { color: theme.text }, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.3)', color: '#F4FBF8', borderColor: 'rgba(255,255,255,0.2)' }]} multiline />

        <Pressable 
          style={[styles.secondaryButton, saving && styles.buttonDisabled, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]} 
          onPress={onSave}
          disabled={saving}
        >
          <Text style={[styles.secondaryButtonText, isDarkMode && { color: theme.primary }]}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </Pressable>

        <View style={[styles.listCard, isDarkMode && { backgroundColor: 'rgba(10, 40, 35, 0.98)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Pickup History</Text>
          {!pickupHistory.length ? (
            <Text style={[styles.emptyText, { color: theme.muted }]}>No pickups yet.</Text>
          ) : (
            pickupHistory.map((h) => (
              <Pressable
                key={h.id}
                style={[styles.historyItem, isDarkMode && { borderBottomColor: 'rgba(255,255,255,0.05)' }]}
                onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: h.id })}
              >
                <Text style={[styles.historyDate, { color: theme.text }]}>{h.createdAt}</Text>
                <Text style={[styles.historyMeta, { color: theme.muted }]}>
                  {getPickupTracking(h, Date.now())?.currentStep.title} | Items: {h.items.length} | Value: ₹{h.totalEstimate || 0}
                </Text>
                <Text style={[styles.historyLink, { color: theme.accent }]}>Tap to track this pickup</Text>
              </Pressable>
            ))
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function MainTabs() {
  const { user, isDarkMode } = useApp();
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: isDarkMode ? 'rgba(255,255,255,0.4)' : '#7B948B',
        tabBarStyle: {
          position: 'absolute',
          bottom: 14,
          left: Platform.OS === 'web' ? '25%' : 16,
          right: Platform.OS === 'web' ? '25%' : 16,
          borderRadius: 28,
          height: 68,
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.65)',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 15,
          paddingBottom: 10,
          paddingTop: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        },
        tabBarBackground: () => (
          <BlurView
            intensity={isDarkMode ? 40 : 60}
            tint={isDarkMode ? 'dark' : 'default'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            Home: 'view-dashboard-outline',
            Schedule: 'calendar-clock',
            Shop: 'gift-outline',
            Profile: 'account-circle-outline',
            Dashboard: 'view-dashboard-outline',
            Assigned: 'truck-check-outline',
            Overview: 'view-grid-plus-outline',
            Requests: 'clipboard-list-outline'
          };
          return <MaterialCommunityIcons name={iconMap[route.name]} size={size} color={color} />;
        }
      })}
    >
      {user?.role === 'recycler' ? (
        <>
          <Tab.Screen name="Dashboard" component={RecyclerOperationsScreen} />
          <Tab.Screen name="Assigned" component={RecyclerAssignedScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : user?.role === 'admin' ? (
        <>
          <Tab.Screen name="Overview" component={AdminOverviewScreen} />
          <Tab.Screen name="Requests" component={AdminRequestsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Schedule" component={SchedulePickupScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

function FloatingHeader({ title, navigation }) {
  const { isDarkMode } = useApp() || { isDarkMode: false };
  const theme = useTheme();
  
  return (
    <View style={{ position: 'absolute', top: 10, left: 0, right: 0, zIndex: 1000, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 44 : 20, alignItems: 'center' }}>
      <BlurView
        intensity={isDarkMode ? 40 : 60}
        tint={isDarkMode ? 'dark' : 'default'}
        style={{
          height: 54,
          width: 'auto',
          minWidth: 200,
          maxWidth: '90%',
          borderRadius: 27,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          overflow: 'hidden'
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: '800', color: theme.text }}>{title}</Text>
        <View style={{ width: 8 }} /> 
      </BlurView>
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState({
    name: 'GreenByte User',
    role: 'customer',
    phone: '',
    address: '',
    availabilityStatus: 'available'
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [pickupDetails, setPickupDetails] = useState({});
  const [pickupHistory, setPickupHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toastTimer = React.useRef(null);

  const toggleDarkMode = React.useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const showToast = React.useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = React.useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      selectedItems,
      setSelectedItems,
      pickupDetails,
      setPickupDetails,
      pickupHistory,
      setPickupHistory,
      isDarkMode,
      toggleDarkMode
    }),
    [user, selectedItems, pickupDetails, pickupHistory, isDarkMode, toggleDarkMode]
  );

  return (
    <ToastContext.Provider value={showToast}>
      <AppContext.Provider value={contextValue}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerTransparent: true }}>
            <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen 
              name="SelectEWaste" 
              component={SelectEWasteScreen} 
              options={{ 
                header: (props) => <FloatingHeader title="Select E-Waste" navigation={props.navigation} />
              }} 
            />
            <Stack.Screen 
              name="TrackPickup" 
              component={TrackPickupScreen} 
              options={{ 
                header: (props) => <FloatingHeader title="Track Pickup" navigation={props.navigation} />
              }} 
            />
            <Stack.Screen 
              name="OrderSummary" 
              component={OrderSummaryScreen} 
              options={{ 
                header: (props) => <FloatingHeader title="Order Summary" navigation={props.navigation} />
              }} 
            />
          </Stack.Navigator>
        </NavigationContainer>
        <ToastBanner toast={toast} onDismiss={dismissToast} />
      </AppContext.Provider>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  glassCardCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  shell: {
    flex: 1,
    backgroundColor: THEME.bg
  },
  container: {
    padding: 18,
    paddingTop: 24,
    flexGrow: 1,
    paddingBottom: 100,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center'
  },
  containerFlex: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center'
  },
  authCard: {
    padding: 22,
    elevation: 3
  },
  screenHeader: {
    marginTop: 2,
    marginBottom: 14
  },
  screenHeaderCentered: {
    alignItems: 'center'
  },
  screenHeaderCompact: {
    marginTop: 0,
    marginBottom: 18
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  logoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  splashTitle: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 1
  },
  splashSubtitle: {
    color: '#CFEADE',
    marginTop: 8,
    fontSize: 16
  },
  heroCard: {
    minHeight: 360,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 30,
    color: THEME.text,
    fontWeight: '700',
    textAlign: 'center'
  },
  heroText: {
    marginTop: 10,
    fontSize: 16,
    color: THEME.muted,
    lineHeight: 24,
    textAlign: 'center'
  },
  dotRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D5E7DF'
  },
  dotActive: {
    width: 28,
    backgroundColor: THEME.primary
  },
  rowGap: {
    marginTop: 18,
    gap: 10
  },
  sectionTitle: {
    fontSize: 28,
    color: THEME.text,
    fontWeight: '800',
    marginBottom: 2,
    lineHeight: 34
  },
  sectionTitleCentered: {
    textAlign: 'center'
  },
  sectionSubtitle: {
    color: THEME.muted,
    marginBottom: 0,
    fontSize: 15,
    lineHeight: 21
  },
  sectionSubtitleCentered: {
    textAlign: 'center'
  },
  homeHeroCard: {
    padding: 22,
    marginBottom: 14,
  },
  homeHeroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  homeLogoBadge: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#E7F6EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CDE6DA'
  },
  homeHeroCopy: {
    flex: 1
  },
  homeHeroEyebrow: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  homeHeroTitle: {
    color: THEME.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: 6
  },
  homeHeroText: {
    color: THEME.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  homeFeatureList: {
    marginTop: 18,
    gap: 12
  },
  homeFeatureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 12,
  },
  homeFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E4F5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeFeatureCopy: {
    flex: 1
  },
  homeFeatureTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '800'
  },
  homeFeatureText: {
    color: THEME.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  metricCard: {
    width: '48%',
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderColor: THEME.border,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10
  },
  trackingHeroCard: {
    padding: 18,
    marginBottom: 12
  },
  trackingHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start'
  },
  trackingHeroLabel: {
    color: '#CFEADE',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  trackingHeroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  trackingHeroMeta: {
    color: '#E6F6EE',
    marginTop: 8,
    lineHeight: 20
  },
  trackingHeroLink: {
    color: '#F9D680',
    fontWeight: '700',
    marginTop: 12
  },
  recyclerStatusCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recyclerStatusLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  recyclerStatusValue: {
    color: THEME.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize'
  },
  recyclerStatusLink: {
    color: THEME.primary,
    fontWeight: '700'
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  metricValue: {
    marginTop: 8,
    color: THEME.text,
    fontSize: 22,
    fontWeight: '800'
  },
  metricLabel: {
    marginTop: 4,
    color: THEME.muted,
    fontSize: 13
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    color: THEME.text,
    fontWeight: '700'
  },
  roleSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  roleChip: {
    flex: 1,
    minWidth: 92,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center'
  },
  roleChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  roleChipText: {
    color: THEME.primaryDark,
    fontWeight: '700'
  },
  roleChipTextActive: {
    color: '#FFFFFF'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  textButton: {
    marginTop: 14,
    alignItems: 'center'
  },
  textButtonText: {
    color: THEME.primary,
    fontWeight: '700'
  },
  otpHintCard: {
    backgroundColor: '#FFF6DE',
    borderWidth: 1,
    borderColor: '#F1DA9B',
    borderRadius: 14,
    padding: 14,
    marginTop: 14
  },
  otpHintLabel: {
    color: '#8A670D',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  otpHintValue: {
    color: '#5F4500',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4
  },
  otpHintText: {
    color: '#846A1E',
    marginTop: 8,
    lineHeight: 20
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#11322A',
    fontSize: 15
  },
  pickerField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  pickerValue: {
    color: THEME.text,
    fontSize: 15,
    fontWeight: '600'
  },
  pickerPlaceholder: {
    color: '#91A79F',
    fontSize: 15
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 74, 52, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    maxHeight: '82%',
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: '800'
  },
  modalSubtitle: {
    marginTop: 6,
    color: THEME.muted,
    lineHeight: 20
  },
  modalList: {
    marginTop: 14,
    marginBottom: 10
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: '#FFFFFF',
    marginBottom: 10
  },
  optionRowActive: {
    borderColor: THEME.primary,
    backgroundColor: '#E8F6EF'
  },
  optionText: {
    color: THEME.text,
    fontWeight: '600'
  },
  optionTextActive: {
    color: THEME.primaryDark
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  modeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 14
  },
  modeCardActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  modeCardTitle: {
    color: THEME.text,
    fontWeight: '800',
    marginTop: 10
  },
  modeCardTitleActive: {
    color: '#FFFFFF'
  },
  modeCardText: {
    color: THEME.muted,
    marginTop: 6,
    lineHeight: 19,
    fontSize: 12
  },
  modeCardTextActive: {
    color: '#DDEFE7'
  },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    borderColor: THEME.primary,
    backgroundColor: '#E4F5EE'
  },
  chipText: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  chipTextActive: {
    color: THEME.primaryDark
  },
  listCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 14
  },
  requestCard: {
    borderTopWidth: 1,
    borderTopColor: '#EEF5F1',
    paddingTop: 12,
    marginTop: 12
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8
  },
  requestCardTitle: {
    color: THEME.text,
    fontWeight: '800'
  },
  requestCardMeta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12
  },
  requestDetailLine: {
    color: THEME.text,
    marginTop: 8,
    lineHeight: 20
  },
  requestActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12
  },
  primaryMiniButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  primaryMiniButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  secondaryMiniButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  secondaryMiniButtonText: {
    color: THEME.primaryDark,
    fontWeight: '700',
    fontSize: 12
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusBadgeNeutral: {
    backgroundColor: '#EAF1EE'
  },
  statusBadgeActive: {
    backgroundColor: '#E2F3EC'
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF2D9'
  },
  statusBadgeSuccess: {
    backgroundColor: '#DFF4E8'
  },
  statusBadgeDanger: {
    backgroundColor: '#FFE8E5'
  },
  statusBadgeText: {
    color: THEME.primaryDark,
    fontWeight: '700',
    fontSize: 12
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8
  },
  itemRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF5F1',
    paddingTop: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  itemMain: {
    flex: 1
  },
  itemTitle: {
    color: THEME.text,
    fontWeight: '700'
  },
  itemMeta: {
    color: THEME.muted,
    marginTop: 4,
    fontSize: 12
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  miniButton: {
    backgroundColor: '#EAF6F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  miniButtonText: {
    color: THEME.primaryDark,
    fontWeight: '700',
    fontSize: 12
  },
  removeBtn: {
    backgroundColor: '#FFEDEA'
  },
  removeText: {
    color: '#A13A2A',
    fontWeight: '700',
    fontSize: 12
  },
  emptyText: {
    color: THEME.muted,
    marginTop: 6
  },
  totalCard: {
    marginTop: 14,
    backgroundColor: '#E4F5EE',
    borderColor: '#BFE1D1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12
  },
  totalText: {
    color: THEME.primaryDark,
    fontSize: 18,
    fontWeight: '800'
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    borderRadius: 12,
    borderColor: THEME.border,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 13
  },
  secondaryButtonText: {
    color: THEME.primaryDark,
    fontSize: 15,
    fontWeight: '700'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    color: THEME.text,
    fontWeight: '600'
  },
  summaryValue: {
    color: THEME.primaryDark,
    fontWeight: '700'
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF5F1',
    marginVertical: 10
  },
  pickupText: {
    color: THEME.text,
    marginBottom: 6,
    lineHeight: 20
  },
  adminActivityRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF5F1',
    paddingTop: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center'
  },
  adminActivityText: {
    flex: 1
  },
  trackingSummaryCard: {
    backgroundColor: '#0D6B4B',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#0A5A40'
  },
  trackingSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  trackingCodeLabel: {
    color: '#CFEADE',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700'
  },
  trackingCodeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  trackingEtaLabel: {
    color: '#CFEADE',
    marginTop: 16,
    fontSize: 13,
    fontWeight: '700'
  },
  trackingEtaValue: {
    color: '#FFFFFF',
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800'
  },
  trackingInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  trackingInfoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 12
  },
  trackingInfoLabel: {
    color: '#CFEADE',
    fontSize: 12,
    fontWeight: '700'
  },
  trackingInfoValue: {
    color: '#FFFFFF',
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22
  },
  trackingAddressCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  trackingAddressBody: {
    flex: 1
  },
  trackingAddressLabel: {
    color: '#CFEADE',
    fontSize: 12,
    fontWeight: '700'
  },
  trackingAddressValue: {
    color: '#FFFFFF',
    marginTop: 4,
    lineHeight: 20
  },
  partnerCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF'
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  partnerHeaderText: {
    color: THEME.primaryDark,
    fontSize: 13,
    fontWeight: '700'
  },
  partnerName: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10
  },
  partnerPhoneLabel: {
    color: THEME.muted,
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  partnerPhoneValue: {
    color: THEME.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4
  },
  timelineCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderColor: THEME.border,
    borderWidth: 1,
    padding: 14
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12
  },
  timelineRail: {
    alignItems: 'center'
  },
  timelineDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF6F0',
    borderWidth: 1,
    borderColor: '#C8E3D7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timelineDotActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  timelineDotComplete: {
    backgroundColor: '#12905F',
    borderColor: '#12905F'
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 34,
    backgroundColor: '#E3EEE8',
    marginVertical: 6
  },
  timelineLineComplete: {
    backgroundColor: '#12905F'
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18
  },
  timelineTitle: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 16
  },
  timelineTitleActive: {
    color: THEME.primaryDark
  },
  timelineDescription: {
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 20
  },
  timelineTag: {
    color: THEME.primary,
    fontWeight: '700',
    marginTop: 8
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: '#EEF5F1',
    paddingTop: 10,
    marginTop: 10
  },
  historyDate: {
    color: THEME.text,
    fontWeight: '700'
  },
  historyMeta: {
    color: THEME.muted,
    marginTop: 4
  },
  historyLink: {
    color: THEME.primary,
    marginTop: 6,
    fontWeight: '700'
  },
  roleBanner: {
    backgroundColor: '#EAF6F0',
    borderColor: '#C7E3D7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 6
  },
  roleBannerLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  roleBannerValue: {
    color: THEME.primaryDark,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize'
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6B5AD',
    backgroundColor: '#FFEDE9',
    alignItems: 'center',
    paddingVertical: 13
  },
  logoutText: {
    color: '#B03D2C',
    fontWeight: '700'
  }
});
