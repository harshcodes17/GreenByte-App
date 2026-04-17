import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

const API_BASE_URL = 'http://localhost:4000/api/v1';

const AppContext = createContext(null);

function useApp() {
  return useContext(AppContext);
}

function computeItemEstimate(item) {
  if (item.unit === 'kg') {
    return item.quantity * item.weightKg * item.price;
  }
  return item.quantity * item.price;
}

const TRACKING_STEPS = [
  {
    key: 'confirmed',
    title: 'Request Confirmed',
    description: 'Your pickup request has been created and locked in.',
    icon: 'clipboard-check-outline'
  },
  {
    key: 'assigned',
    title: 'Pickup Partner Assigned',
    description: 'A GreenByte pickup partner is reviewing your route details.',
    icon: 'account-check-outline'
  },
  {
    key: 'onTheWay',
    title: 'Truck On The Way',
    description: 'The pickup vehicle has started moving toward your address.',
    icon: 'truck-fast-outline'
  },
  {
    key: 'arriving',
    title: 'Arriving Soon',
    description: 'The team is very close. Keep your items ready at the gate.',
    icon: 'map-marker-radius-outline'
  },
  {
    key: 'completed',
    title: 'Pickup Completed',
    description: 'Your e-waste has been collected successfully.',
    icon: 'check-decagram-outline'
  }
];

const PICKUP_PARTNERS = [
  { name: 'Rohit Patil', phone: '+91 98765 23110' },
  { name: 'Ayesha Khan', phone: '+91 98765 23111' },
  { name: 'Nikhil Joshi', phone: '+91 98765 23112' },
  { name: 'Sneha More', phone: '+91 98765 23113' }
];

const REQUEST_STATUS_META = {
  submitted: { label: 'Awaiting recycler', tone: 'neutral' },
  assigned: { label: 'Recycler assigned', tone: 'active' },
  onTheWay: { label: 'Vehicle on the way', tone: 'active' },
  arriving: { label: 'Arriving soon', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  rejected: { label: 'Skipped by recycler', tone: 'danger' }
};

function getPickupCreatedAtMs(record) {
  if (record?.createdAtMs) {
    return record.createdAtMs;
  }

  const parsed = Date.parse(record?.createdAt || '');
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function getPickupTracking(record, now = Date.now()) {
  if (!record) {
    return null;
  }

  const explicitStepMap = {
    submitted: 0,
    assigned: 1,
    onTheWay: 2,
    arriving: 3,
    completed: 4,
    rejected: 0
  };

  const elapsedMinutes = Math.max(0, Math.floor((now - getPickupCreatedAtMs(record)) / 60000));

  let activeStep = explicitStepMap[record.status];
  if (typeof activeStep !== 'number') {
    if (record.status === 'completed' || elapsedMinutes >= 9) {
      activeStep = 4;
    } else if (elapsedMinutes >= 6) {
      activeStep = 3;
    } else if (elapsedMinutes >= 3) {
      activeStep = 2;
    } else if (elapsedMinutes >= 1) {
      activeStep = 1;
    } else {
      activeStep = 0;
    }
  }

  const currentStep = TRACKING_STEPS[activeStep];
  const etaText =
    record.status === 'rejected'
      ? 'A recycler skipped this request. It is waiting for another partner.'
      : activeStep === 4
      ? 'Collected successfully'
      : activeStep === 3
        ? 'Driver is about to reach you'
        : activeStep === 2
          ? 'About 15 to 20 minutes away'
          : activeStep === 1
            ? 'Partner assignment in progress'
            : 'Confirming route and vehicle';

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
  return (
    <LinearGradient colors={['#EFFAF4', '#F8FDFA']} style={styles.shell}>
      <StatusBar style="dark" />
      {children}
    </LinearGradient>
  );
}

function ScreenHeader({ title, subtitle, centered = false, compact = false }) {
  return (
    <View style={[styles.screenHeader, centered && styles.screenHeaderCentered, compact && styles.screenHeaderCompact]}>
      <Text style={[styles.sectionTitle, centered && styles.sectionTitleCentered]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, centered && styles.sectionSubtitleCentered]}>{subtitle}</Text> : null}
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

const DATE_OPTIONS = createDateOptions();
const TIME_OPTIONS = createTimeOptions();

function SplashScreen({ navigation }) {
  React.useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('Onboarding');
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
    { title: 'Earn rewards', text: 'Get fair value using trusted GreenByte supplier pricing.' },
    { title: 'Schedule pickup', text: 'Choose your date, time, and address in under a minute.' }
  ];
  const [index, setIndex] = useState(0);
  const current = slides[index];

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.heroCard}>
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
            <Pressable style={styles.primaryButton} onPress={() => navigation.replace('Register')}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [organizationName, setOrganizationName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onRegister = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (name.trim().length < 2) {
      Alert.alert('Invalid name', 'Enter your full name to register.');
      return;
    }
    if (cleaned.length < 10) {
      Alert.alert('Invalid phone', 'Enter a valid mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: cleaned,
          role,
          organizationName: role === 'customer' ? '' : organizationName.trim()
        })
      });

      Alert.alert('Registration complete', 'Your account has been created. Please log in with OTP.');
      navigation.replace('Login', {
        phone: cleaned,
        role
      });
    } catch (error) {
      Alert.alert('Registration failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={styles.authCard}>
          <ScreenHeader
            title="Register"
            subtitle="Create your GreenByte account before logging in with OTP"
            centered
            compact
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleSelectorRow}>
            {ROLE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.roleChip, role === option.value && styles.roleChipActive]}
                onPress={() => setRole(option.value)}
              >
                <Text style={[styles.roleChipText, role === option.value && styles.roleChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#91A79F"
          />

          {role !== 'customer' ? (
            <>
              <Text style={styles.label}>{role === 'recycler' ? 'Company Name' : 'Organization'}</Text>
              <TextInput
                value={organizationName}
                onChangeText={setOrganizationName}
                style={styles.input}
                placeholder={role === 'recycler' ? 'Recycler company name' : 'Admin organization'}
                placeholderTextColor="#91A79F"
              />
            </>
          ) : null}

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
  const prefilledPhone = route.params?.phone || '';
  const prefilledRole = route.params?.role || 'customer';
  const [phone, setPhone] = useState(prefilledPhone);
  const [role, setRole] = useState(prefilledRole);
  const [submitting, setSubmitting] = useState(false);

  const onContinue = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid phone', 'Enter a valid mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleaned,
          role
        })
      });

      Alert.alert('OTP sent', `Demo OTP: ${response.data.demoOtp}`);
      navigation.navigate('OtpVerification', {
        phone: cleaned,
        role,
        demoOtp: response.data.demoOtp
      });
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={styles.authCard}>
          <ScreenHeader
            title="Login"
            subtitle="Use your registered mobile number to receive an OTP"
            centered
            compact
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleSelectorRow}>
            {ROLE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.roleChip, role === option.value && styles.roleChipActive]}
                onPress={() => setRole(option.value)}
              >
                <Text style={[styles.roleChipText, role === option.value && styles.roleChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="Registered mobile number"
            placeholderTextColor="#91A79F"
            maxLength={15}
          />

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={onContinue}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Sending OTP...' : 'Send OTP'}</Text>
          </Pressable>

          <Pressable style={styles.textButton} onPress={() => navigation.replace('Register')}>
            <Text style={styles.textButtonText}>Need an account? Register first</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function OtpVerificationScreen({ navigation, route }) {
  const { setUser } = useApp();
  const phone = route.params?.phone || '';
  const role = route.params?.role || 'customer';
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState(route.params?.demoOtp || '');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const onVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP sent to your phone.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          role,
          otp: otp.trim()
        })
      });

      setUser((prev) => ({
        ...prev,
        ...response.data,
        availabilityStatus: prev.availabilityStatus || 'available'
      }));
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });
    } catch (error) {
      Alert.alert('Verification failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    try {
      setResending(true);
      const response = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          role
        })
      });
      setDemoOtp(response.data.demoOtp);
      Alert.alert('OTP resent', `Demo OTP: ${response.data.demoOtp}`);
    } catch (error) {
      Alert.alert('Resend failed', error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={styles.authCard}>
          <ScreenHeader
            title="Verify OTP"
            subtitle={`Enter the OTP sent to ${phone}`}
            centered
            compact
          />

          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="6-digit OTP"
            placeholderTextColor="#91A79F"
            maxLength={6}
          />

          <View style={styles.otpHintCard}>
            <Text style={styles.otpHintLabel}>Demo OTP</Text>
            <Text style={styles.otpHintValue}>{demoOtp || 'Request OTP first'}</Text>
            <Text style={styles.otpHintText}>
              Replace this with an SMS gateway later. For now the generated OTP is shown here for testing.
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
  const { pickupHistory } = useApp();
  const latestPickup = pickupHistory[0];
  const tracking = getPickupTracking(latestPickup, refreshNow);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRefreshNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'CO2 saved', value: '128 kg', icon: 'molecule-co2' },
    { label: 'Trees saved', value: '19', icon: 'pine-tree' },
    { label: 'Animals saved', value: '11', icon: 'paw' },
    { label: 'Raw material', value: '350 kg', icon: 'factory' },
    { label: 'Pickups completed', value: '8', icon: 'truck-check' }
  ];

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="GreenByte Dashboard" subtitle="Your impact at a glance" />

        <View style={styles.metricGrid}>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <MaterialCommunityIcons name={m.icon} size={24} color={THEME.primary} />
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {latestPickup ? (
          <Pressable
            style={styles.trackingHeroCard}
            onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: latestPickup.id })}
          >
            <View style={styles.trackingHeroHeader}>
              <View>
                <Text style={styles.trackingHeroLabel}>Current Pickup</Text>
                <Text style={styles.trackingHeroTitle}>{tracking.currentStep.title}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  Step {tracking.activeStep + 1}/{TRACKING_STEPS.length}
                </Text>
              </View>
            </View>
            <Text style={styles.trackingHeroMeta}>
              {latestPickup.pickupDetails?.date || '-'} at {latestPickup.pickupDetails?.time || '-'}
            </Text>
            <Text style={styles.trackingHeroMeta}>{tracking.etaText}</Text>
            <Text style={styles.trackingHeroLink}>View live pickup progress</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={() => navigation.getParent()?.navigate('SelectEWaste')}>
          <Text style={styles.primaryButtonText}>Schedule Pickup</Text>
        </Pressable>
        {latestPickup ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: latestPickup.id })}
          >
            <Text style={styles.secondaryButtonText}>Track Current Pickup</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Shop')}>
          <Text style={styles.secondaryButtonText}>Rewards Shop</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.secondaryButtonText}>Pickup History</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.secondaryButtonText}>Profile</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function SelectEWasteScreen({ navigation }) {
  const { selectedItems, setSelectedItems } = useApp();
  const categories = Object.keys(PRICE_CATALOG);

  const [category, setCategory] = useState(categories[0]);
  const [itemName, setItemName] = useState(PRICE_CATALOG[categories[0]][0].name);
  const [quantity, setQuantity] = useState('1');
  const [weightKg, setWeightKg] = useState('');
  const [editingId, setEditingId] = useState(null);

  const itemOptions = PRICE_CATALOG[category];
  const selectedMeta = itemOptions.find((x) => x.name === itemName);

  const onCategoryChange = (next) => {
    setCategory(next);
    setItemName(PRICE_CATALOG[next][0].name);
  };

  const resetForm = () => {
    setQuantity('1');
    setWeightKg('');
    setEditingId(null);
  };

  const onAddOrUpdate = () => {
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      Alert.alert('Invalid quantity', 'Quantity must be at least 1.');
      return;
    }

    let weight = 0;
    if (selectedMeta.unit === 'kg') {
      weight = Number(weightKg);
      if (!Number.isFinite(weight) || weight <= 0) {
        Alert.alert('Invalid weight', 'Enter weight in kg for this item.');
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
      weightKg: selectedMeta.unit === 'kg' ? weight : 0
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
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Select E-Waste"
          subtitle="Add, edit, or remove items before pickup."
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipsRow}>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => onCategoryChange(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Item</Text>
        <View style={styles.chipsRow}>
          {itemOptions.map((it) => (
            <Pressable
              key={it.name}
              style={[styles.chip, itemName === it.name && styles.chipActive]}
              onPress={() => setItemName(it.name)}
            >
              <Text style={[styles.chipText, itemName === it.name && styles.chipTextActive]}>
                {it.name} ({it.price}/{it.unit})
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="e.g. 2"
          placeholderTextColor="#91A79F"
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

        <Pressable style={styles.primaryButton} onPress={onAddOrUpdate}>
          <Text style={styles.primaryButtonText}>{editingId ? 'Update Item' : 'Add Item'}</Text>
        </Pressable>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Selected Items</Text>
          {selectedItems.length === 0 ? (
            <Text style={styles.emptyText}>No items added yet.</Text>
          ) : (
            selectedItems.map((item) => {
              const estimate = computeItemEstimate(item);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemTitle}>
                      {item.name} x {item.quantity}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.unit === 'kg' ? `${item.weightKg} kg each` : `${item.price}/pc`} | Est. {estimate}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable style={styles.miniButton} onPress={() => onEdit(item)}>
                      <Text style={styles.miniButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.miniButton, styles.removeBtn]} onPress={() => onRemove(item.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalText}>Estimated Value: {total}</Text>
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
  const { selectedItems, pickupDetails, setPickupDetails } = useApp();
  const [pickupDate, setPickupDate] = useState(pickupDetails.date || '');
  const [pickupTime, setPickupTime] = useState(pickupDetails.time || '');
  const [requestMode, setRequestMode] = useState(pickupDetails.mode || 'pickup');
  const [address, setAddress] = useState(pickupDetails.address || '');
  const [phone, setPhone] = useState(pickupDetails.phone || '');
  const [notes, setNotes] = useState(pickupDetails.notes || '');
  const [activePicker, setActivePicker] = useState(null);

  const onReview = () => {
    if (!selectedItems.length) {
      Alert.alert('No items selected', 'Add e-waste items before scheduling pickup.');
      navigation.getParent()?.navigate('SelectEWaste');
      return;
    }
    if (!pickupDate || !pickupTime || !address || !phone) {
      Alert.alert('Missing fields', 'Please fill date, time, address, and phone number.');
      return;
    }

    setPickupDetails({
      date: pickupDate,
      time: pickupTime,
      mode: requestMode,
      address,
      phone,
      notes
    });
    navigation.getParent()?.navigate('OrderSummary');
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Schedule Pickup" subtitle="Pick a date and time for your pickup." />

        <Text style={styles.label}>Collection Mode</Text>
        <View style={styles.modeSelectorRow}>
          <Pressable
            style={[styles.modeCard, requestMode === 'pickup' && styles.modeCardActive]}
            onPress={() => setRequestMode('pickup')}
          >
            <MaterialCommunityIcons name="truck-outline" size={22} color={requestMode === 'pickup' ? '#FFFFFF' : THEME.primary} />
            <Text style={[styles.modeCardTitle, requestMode === 'pickup' && styles.modeCardTitleActive]}>
              Doorstep Pickup
            </Text>
            <Text style={[styles.modeCardText, requestMode === 'pickup' && styles.modeCardTextActive]}>
              We collect e-waste from your location.
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeCard, requestMode === 'dropoff' && styles.modeCardActive]}
            onPress={() => setRequestMode('dropoff')}
          >
            <MaterialCommunityIcons name="map-marker-check-outline" size={22} color={requestMode === 'dropoff' ? '#FFFFFF' : THEME.primary} />
            <Text style={[styles.modeCardTitle, requestMode === 'dropoff' && styles.modeCardTitleActive]}>
              Drop-off
            </Text>
            <Text style={[styles.modeCardText, requestMode === 'dropoff' && styles.modeCardTextActive]}>
              You bring items to an authorized collection point.
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Pickup Date</Text>
        <Pressable style={styles.pickerField} onPress={() => setActivePicker('date')}>
          <MaterialCommunityIcons name="calendar-outline" size={20} color={THEME.primary} />
          <Text style={pickupDate ? styles.pickerValue : styles.pickerPlaceholder}>
            {pickupDate || 'Choose date'}
          </Text>
        </Pressable>

        <Text style={styles.label}>Pickup Time</Text>
        <Pressable style={styles.pickerField} onPress={() => setActivePicker('time')}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={THEME.primary} />
          <Text style={pickupTime ? styles.pickerValue : styles.pickerPlaceholder}>
            {pickupTime || 'Choose time'}
          </Text>
        </Pressable>

        <Text style={styles.label}>{requestMode === 'pickup' ? 'Pickup Address' : 'Preferred Drop-off Point / Area'}</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          placeholder={requestMode === 'pickup' ? 'Pickup address' : 'Collection point area or branch'}
          placeholderTextColor="#91A79F"
          multiline
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="Mobile number"
          placeholderTextColor="#91A79F"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
          placeholder="Gate number, landmark, etc."
          placeholderTextColor="#91A79F"
          multiline
        />

        <Pressable style={styles.secondaryButton} onPress={() => navigation.getParent()?.navigate('SelectEWaste')}>
          <Text style={styles.secondaryButtonText}>Edit E-Waste Items</Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={onReview}>
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
          visible={activePicker === 'time'}
          title="Select Pickup Time"
          subtitle="Choose a pickup slot that works for you."
          options={TIME_OPTIONS}
          selectedValue={pickupTime}
          onClose={() => setActivePicker(null)}
          onSelect={(option) => {
            setPickupTime(option.label);
            setActivePicker(null);
          }}
        />
      </ScrollView>
    </ScreenShell>
  );
}

function OrderSummaryScreen({ navigation }) {
  const {
    selectedItems,
    pickupDetails,
    pickupHistory,
    setPickupHistory,
    setSelectedItems,
    setPickupDetails
  } = useApp();

  const total = selectedItems.reduce((sum, item) => sum + computeItemEstimate(item), 0);

  const onConfirm = () => {
    if (!selectedItems.length) {
      Alert.alert('No items', 'Add items before confirming.');
      return;
    }

    const now = new Date();

    const newRecord = {
      id: `${now.getTime()}`,
      trackingId: `GB-${String(now.getTime()).slice(-6)}`,
      createdAt: now.toLocaleString(),
      createdAtMs: now.getTime(),
      status: 'submitted',
      pickupPartner: createPickupPartner(now.getTime()),
      recyclerDecisions: [],
      requestMode: pickupDetails.mode || 'pickup',
      items: selectedItems,
      total,
      pickupDetails
    };

    setPickupHistory([newRecord, ...pickupHistory]);
    setSelectedItems([]);
    setPickupDetails({});

    Alert.alert('Pickup confirmed', 'Your GreenByte request was submitted successfully.', [
      {
        text: 'Track pickup',
        onPress: () => navigation.navigate('TrackPickup', { pickupId: newRecord.id })
      }
    ]);
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Order Summary" subtitle="Review everything before confirming." />

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Selected Items</Text>
          {selectedItems.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.name} x {item.quantity}
              </Text>
              <Text style={styles.summaryValue}>{computeItemEstimate(item)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalText}>Estimated Value</Text>
            <Text style={styles.totalText}>{total}</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Pickup Details</Text>
          <Text style={styles.pickupText}>Mode: {pickupDetails.mode === 'dropoff' ? 'Drop-off' : 'Doorstep Pickup'}</Text>
          <Text style={styles.pickupText}>Date: {pickupDetails.date || '-'}</Text>
          <Text style={styles.pickupText}>Time: {pickupDetails.time || '-'}</Text>
          <Text style={styles.pickupText}>Address: {pickupDetails.address || '-'}</Text>
          <Text style={styles.pickupText}>Phone: {pickupDetails.phone || '-'}</Text>
          {pickupDetails.notes ? <Text style={styles.pickupText}>Notes: {pickupDetails.notes}</Text> : null}
        </View>

        <Pressable style={styles.primaryButton} onPress={onConfirm}>
          <Text style={styles.primaryButtonText}>Confirm Pickup Request</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function RewardsShopScreen() {
  const rewards = [
    { name: 'Eco Tote Bag', coins: 120 },
    { name: 'Plant a Tree', coins: 200 },
    { name: 'Gift Voucher', coins: 350 },
    { name: 'Recycled Notebook', coins: 90 }
  ];

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Rewards Shop" subtitle="Redeem rewards with your coins." />
        <View style={styles.coinsCard}>
          <Text style={styles.coinCount}>1,240 Coins</Text>
          <Text style={styles.coinMeta}>Keep scheduling pickups to earn more.</Text>
        </View>

        {rewards.map((item) => (
          <View key={item.name} style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>{item.name}</Text>
            <Text style={styles.rewardCoins}>{item.coins} coins</Text>
            <Pressable style={styles.miniButton}>
              <Text style={styles.miniButtonText}>Redeem</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

function RecyclerOperationsScreen() {
  const { user, setUser, pickupHistory, setPickupHistory } = useApp();
  const availabilityStatus = user.availabilityStatus || 'available';
  const openRequests = pickupHistory.filter((request) => {
    const rejectedByMe = request.recyclerDecisions?.some(
      (entry) => entry.recyclerPhone === user.phone && entry.decision === 'rejected'
    );

    return request.status === 'submitted' && !request.assignedRecyclerPhone && !rejectedByMe;
  });

  const assignedCount = pickupHistory.filter((request) => request.assignedRecyclerPhone === user.phone).length;

  const onChangeAvailability = () => {
    const next =
      availabilityStatus === 'available'
        ? 'busy'
        : availabilityStatus === 'busy'
          ? 'offline'
          : 'available';

    setUser((prev) => ({ ...prev, availabilityStatus: next }));
  };

  const onAccept = (requestId) => {
    setPickupHistory((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: 'assigned',
              assignedRecyclerName: user.name,
              assignedRecyclerPhone: user.phone,
              pickupPartner: {
                name: user.name,
                phone: user.phone
              },
              recyclerDecisions: [
                ...(request.recyclerDecisions || []),
                {
                  recyclerPhone: user.phone,
                  recyclerName: user.name,
                  decision: 'accepted',
                  createdAt: new Date().toLocaleString()
                }
              ]
            }
          : request
      )
    );
  };

  const onReject = (requestId) => {
    setPickupHistory((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              recyclerDecisions: [
                ...(request.recyclerDecisions || []),
                {
                  recyclerPhone: user.phone,
                  recyclerName: user.name,
                  decision: 'rejected',
                  createdAt: new Date().toLocaleString()
                }
              ]
            }
          : request
      )
    );
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Recycler Dashboard" subtitle="Review new requests and manage collection availability." />

        <Pressable style={styles.recyclerStatusCard} onPress={onChangeAvailability}>
          <View>
            <Text style={styles.recyclerStatusLabel}>Availability</Text>
            <Text style={styles.recyclerStatusValue}>{availabilityStatus}</Text>
          </View>
          <Text style={styles.recyclerStatusLink}>Tap to switch</Text>
        </Pressable>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="inbox-arrow-down-outline" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{openRequests.length}</Text>
            <Text style={styles.metricLabel}>Open requests</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="truck-check-outline" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{assignedCount}</Text>
            <Text style={styles.metricLabel}>Assigned to you</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>New Collection Requests</Text>
          {!openRequests.length ? (
            <Text style={styles.emptyText}>No new requests are waiting right now.</Text>
          ) : (
            openRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={styles.requestCardTitle}>{request.requestMode === 'dropoff' ? 'Drop-off Request' : 'Pickup Request'}</Text>
                    <Text style={styles.requestCardMeta}>
                      {request.items.length} items | Value {request.total}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                    <Text style={styles.statusBadgeText}>New</Text>
                  </View>
                </View>
                <Text style={styles.requestDetailLine}>Date: {request.pickupDetails?.date || '-'}</Text>
                <Text style={styles.requestDetailLine}>Time: {request.pickupDetails?.time || '-'}</Text>
                <Text style={styles.requestDetailLine}>Location: {request.pickupDetails?.address || '-'}</Text>
                <View style={styles.requestActionRow}>
                  <Pressable style={styles.secondaryMiniButton} onPress={() => onReject(request.id)}>
                    <Text style={styles.secondaryMiniButtonText}>Reject</Text>
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
  const { user, pickupHistory, setPickupHistory } = useApp();
  const assignedRequests = pickupHistory.filter(
    (request) => request.assignedRecyclerPhone === user.phone && request.status !== 'rejected'
  );

  const onAdvance = (requestId) => {
    setPickupHistory((prev) =>
      prev.map((request) => {
        if (request.id !== requestId) {
          return request;
        }

        const nextStatus =
          request.status === 'assigned'
            ? 'onTheWay'
            : request.status === 'onTheWay'
              ? 'arriving'
              : request.status === 'arriving'
                ? 'completed'
                : request.status;

        return {
          ...request,
          status: nextStatus
        };
      })
    );
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
            const actionText =
              request.status === 'assigned'
                ? 'Start Route'
                : request.status === 'onTheWay'
                  ? 'Mark Arriving'
                  : request.status === 'arriving'
                    ? 'Complete Pickup'
                    : null;

            return (
              <View key={request.id} style={styles.listCard}>
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={styles.requestCardTitle}>{request.trackingId}</Text>
                    <Text style={styles.requestCardMeta}>{request.items.length} items | {request.total}</Text>
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
                <Text style={styles.requestDetailLine}>Customer: {request.pickupDetails?.phone || '-'}</Text>
                <Text style={styles.requestDetailLine}>Address: {request.pickupDetails?.address || '-'}</Text>
                {actionText ? (
                  <Pressable style={styles.primaryButton} onPress={() => onAdvance(request.id)}>
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

function AdminOverviewScreen() {
  const { pickupHistory } = useApp();
  const totalValue = pickupHistory.reduce((sum, request) => sum + request.total, 0);
  const completedCount = pickupHistory.filter((request) => request.status === 'completed').length;
  const inProgressCount = pickupHistory.filter((request) =>
    ['assigned', 'onTheWay', 'arriving'].includes(request.status)
  ).length;

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Admin Overview" subtitle="Monitor marketplace activity, collection flow, and sustainability outcomes." />

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{pickupHistory.length}</Text>
            <Text style={styles.metricLabel}>Total requests</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="truck-fast-outline" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{inProgressCount}</Text>
            <Text style={styles.metricLabel}>In progress</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="recycle" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{completedCount}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
          <View style={styles.metricCard}>
            <MaterialCommunityIcons name="currency-inr" size={24} color={THEME.primary} />
            <Text style={styles.metricValue}>{totalValue}</Text>
            <Text style={styles.metricLabel}>Quoted value</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Recent Platform Activity</Text>
          {!pickupHistory.length ? (
            <Text style={styles.emptyText}>No requests have been created yet.</Text>
          ) : (
            pickupHistory.slice(0, 5).map((request) => {
              const statusMeta = getRequestStatusMeta(request.status);
              return (
                <View key={request.id} style={styles.adminActivityRow}>
                  <View style={styles.adminActivityText}>
                    <Text style={styles.requestCardTitle}>{request.trackingId || request.id}</Text>
                    <Text style={styles.requestCardMeta}>
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
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function AdminRequestsScreen({ navigation }) {
  const { pickupHistory } = useApp();

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
                style={styles.listCard}
                onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: request.id })}
              >
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={styles.requestCardTitle}>{request.trackingId || request.id}</Text>
                    <Text style={styles.requestCardMeta}>
                      {request.pickupDetails?.date || '-'} | {request.total}
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
                </View>
                <Text style={styles.requestDetailLine}>Mode: {request.requestMode === 'dropoff' ? 'Drop-off' : 'Doorstep Pickup'}</Text>
                <Text style={styles.requestDetailLine}>Customer phone: {request.pickupDetails?.phone || '-'}</Text>
                <Text style={styles.requestDetailLine}>
                  Recycler: {request.assignedRecyclerName || request.pickupPartner?.name || 'Not assigned'}
                </Text>
                <Text style={styles.historyLink}>Tap to inspect tracking view</Text>
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
  const { pickupHistory } = useApp();
  const pickupId = route.params?.pickupId;
  const pickup = pickupId ? pickupHistory.find((entry) => entry.id === pickupId) : pickupHistory[0];
  const tracking = getPickupTracking(pickup, refreshNow);
  const assignedPartner = pickup?.pickupPartner || createPickupPartner(pickup?.id || Date.now());
  const showPartnerDetails = Boolean(pickup && tracking && tracking.activeStep >= 1);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRefreshNow(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Track Pickup" subtitle="Follow the live journey of your e-waste pickup." />

        <View style={styles.trackingSummaryCard}>
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
            <View style={styles.trackingInfoCard}>
              <Text style={styles.trackingInfoLabel}>Pickup slot</Text>
              <Text style={styles.trackingInfoValue}>
                {pickup.pickupDetails?.date || '-'}{'\n'}{pickup.pickupDetails?.time || '-'}
              </Text>
            </View>
            <View style={styles.trackingInfoCard}>
              <Text style={styles.trackingInfoLabel}>Request mode</Text>
              <Text style={styles.trackingInfoValue}>
                {pickup.requestMode === 'dropoff' || pickup.pickupDetails?.mode === 'dropoff'
                  ? 'Drop-off'
                  : 'Pickup'}
              </Text>
            </View>
          </View>

          <View style={styles.trackingAddressCard}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={THEME.primary} />
            <View style={styles.trackingAddressBody}>
              <Text style={styles.trackingAddressLabel}>Pickup address</Text>
              <Text style={styles.trackingAddressValue}>{pickup.pickupDetails?.address || '-'}</Text>
            </View>
          </View>

          {showPartnerDetails ? (
            <View style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <MaterialCommunityIcons name="account-tie-outline" size={20} color={THEME.primary} />
                <Text style={styles.partnerHeaderText}>Assigned pickup partner</Text>
              </View>
              <Text style={styles.partnerName}>{assignedPartner.name}</Text>
              <Text style={styles.partnerPhoneLabel}>Partner mobile number</Text>
              <Text style={styles.partnerPhoneValue}>{assignedPartner.phone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Progress Timeline</Text>
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
                      isActive && styles.timelineDotActive
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isComplete ? 'check' : step.icon}
                      size={isComplete ? 14 : 16}
                      color={isComplete || isActive ? '#FFFFFF' : THEME.primary}
                    />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        styles.timelineLine,
                        index < tracking.activeStep && styles.timelineLineComplete
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, (isActive || isComplete) && styles.timelineTitleActive]}>
                    {step.title}
                  </Text>
                  <Text style={styles.timelineDescription}>{step.description}</Text>
                  {isActive ? <Text style={styles.timelineTag}>Current step</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Pickup Summary</Text>
          {pickup.items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {item.name} x {item.quantity}
              </Text>
              <Text style={styles.summaryValue}>{computeItemEstimate(item)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <Text style={styles.pickupText}>Booked on: {pickup.createdAt}</Text>
          <Text style={styles.pickupText}>Phone: {pickup.pickupDetails?.phone || '-'}</Text>
          {pickup.pickupDetails?.notes ? <Text style={styles.pickupText}>Notes: {pickup.pickupDetails.notes}</Text> : null}
        </View>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}>
          <Text style={styles.secondaryButtonText}>View Pickup History</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function ProfileScreen({ navigation }) {
  const { user, setUser, pickupHistory } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);

  const onSave = () => {
    setUser((prev) => ({ ...prev, name, phone, address }));
    Alert.alert('Saved', 'Profile updated.');
  };

  const onLogout = () => {
    setUser({
      name: 'GreenByte User',
      role: 'customer',
      phone: '',
      address: '',
      availabilityStatus: 'available'
    });
    navigation.getParent()?.replace('Login');
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Profile" subtitle="Manage your account and history." />

        <View style={styles.roleBanner}>
          <Text style={styles.roleBannerLabel}>Logged in as</Text>
          <Text style={styles.roleBannerValue}>{user.role}</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />

        <Text style={styles.label}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />

        <Text style={styles.label}>Address</Text>
        <TextInput value={address} onChangeText={setAddress} style={styles.input} multiline />

        <Pressable style={styles.secondaryButton} onPress={onSave}>
          <Text style={styles.secondaryButtonText}>Save Profile</Text>
        </Pressable>

        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Pickup History</Text>
          {!pickupHistory.length ? (
            <Text style={styles.emptyText}>No pickups yet.</Text>
          ) : (
            pickupHistory.map((h) => (
              <Pressable
                key={h.id}
                style={styles.historyItem}
                onPress={() => navigation.getParent()?.navigate('TrackPickup', { pickupId: h.id })}
              >
                <Text style={styles.historyDate}>{h.createdAt}</Text>
                <Text style={styles.historyMeta}>
                  {getPickupTracking(h, Date.now())?.currentStep.title} | Items: {h.items.length} | Value: {h.total}
                </Text>
                <Text style={styles.historyLink}>Tap to track this pickup</Text>
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
  const { user } = useApp();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: '#7B948B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: THEME.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6
        },
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
      {user.role === 'recycler' ? (
        <>
          <Tab.Screen name="Dashboard" component={RecyclerOperationsScreen} />
          <Tab.Screen name="Assigned" component={RecyclerAssignedScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : user.role === 'admin' ? (
        <>
          <Tab.Screen name="Overview" component={AdminOverviewScreen} />
          <Tab.Screen name="Requests" component={AdminRequestsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Schedule" component={SchedulePickupScreen} />
          <Tab.Screen name="Shop" component={RewardsShopScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
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

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      selectedItems,
      setSelectedItems,
      pickupDetails,
      setPickupDetails,
      pickupHistory,
      setPickupHistory
    }),
    [user, selectedItems, pickupDetails, pickupHistory]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="SelectEWaste" component={SelectEWasteScreen} options={{ title: 'Select E-Waste' }} />
          <Stack.Screen name="TrackPickup" component={TrackPickupScreen} options={{ title: 'Track Pickup' }} />
          <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} options={{ title: 'Order Summary' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: THEME.bg
  },
  container: {
    padding: 18,
    paddingTop: 24,
    flexGrow: 1,
    paddingBottom: 32
  },
  containerFlex: {
    flex: 1,
    padding: 18,
    justifyContent: 'center'
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    minHeight: 360,
    justifyContent: 'center',
    alignItems: 'center'
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
    backgroundColor: '#0D6B4B',
    borderRadius: 18,
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
    borderColor: THEME.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.text,
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
    padding: 18
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    maxHeight: '82%'
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
    backgroundColor: '#FFFFFF',
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
  coinsCard: {
    backgroundColor: '#FFF5D9',
    borderColor: '#F5D99D',
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8
  },
  coinCount: {
    color: '#7A5A00',
    fontSize: 24,
    fontWeight: '800'
  },
  coinMeta: {
    marginTop: 4,
    color: '#8F6D14'
  },
  rewardCard: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rewardTitle: {
    color: THEME.text,
    fontWeight: '700'
  },
  rewardCoins: {
    color: THEME.muted
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
