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
            <Pressable style={styles.primaryButton} onPress={() => navigation.replace('Login')}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenShell>
  );
}

function LoginScreen({ navigation }) {
  const { user, setUser } = useApp();
  const [phone, setPhone] = useState(user.phone || '');

  const onContinue = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid phone', 'Enter a valid mobile number.');
      return;
    }
    setUser((prev) => ({ ...prev, phone: cleaned }));
    navigation.replace('MainTabs');
  };

  return (
    <ScreenShell>
      <View style={styles.containerFlex}>
        <View style={styles.authCard}>
          <ScreenHeader
            title="Login"
            subtitle="Enter your mobile number to continue"
            centered
            compact
          />

          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            placeholder="Mobile number"
            placeholderTextColor="#91A79F"
            maxLength={15}
          />

          <Pressable style={styles.primaryButton} onPress={onContinue}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function HomeScreen({ navigation }) {
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

        <Pressable style={styles.primaryButton} onPress={() => navigation.getParent()?.navigate('SelectEWaste')}>
          <Text style={styles.primaryButtonText}>Schedule Pickup</Text>
        </Pressable>
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

        <Text style={styles.label}>Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          placeholder="Pickup address"
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

    const newRecord = {
      id: `${Date.now()}`,
      createdAt: new Date().toLocaleString(),
      items: selectedItems,
      total,
      pickupDetails
    };

    setPickupHistory([newRecord, ...pickupHistory]);
    setSelectedItems([]);
    setPickupDetails({});

    Alert.alert('Pickup confirmed', 'Your GreenByte request was submitted successfully.');
    navigation.navigate('MainTabs', { screen: 'Home' });
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

function ProfileScreen({ navigation }) {
  const { user, setUser, pickupHistory } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);

  const onSave = () => {
    setUser({ name, phone, address });
    Alert.alert('Saved', 'Profile updated.');
  };

  const onLogout = () => {
    navigation.getParent()?.replace('Login');
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Profile" subtitle="Manage your account and history." />

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
              <View key={h.id} style={styles.historyItem}>
                <Text style={styles.historyDate}>{h.createdAt}</Text>
                <Text style={styles.historyMeta}>Items: {h.items.length} | Value: {h.total}</Text>
              </View>
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
            Profile: 'account-circle-outline'
          };
          return <MaterialCommunityIcons name={iconMap[route.name]} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={SchedulePickupScreen} />
      <Tab.Screen name="Shop" component={RewardsShopScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState({
    name: 'GreenByte User',
    phone: '',
    address: ''
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
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="SelectEWaste" component={SelectEWasteScreen} options={{ title: 'Select E-Waste' }} />
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
