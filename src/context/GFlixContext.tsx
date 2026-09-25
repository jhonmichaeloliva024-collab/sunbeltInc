import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ActiveLease,
  PageTab,
  ReferralUser,
  ServerPackage,
  UserAccountRecord,
  UserWalletState,
  WalletTransaction,
} from '../types';
import { SERVER_PACKAGES } from '../data/serverPackages';
import { hashPassword, maskPassword } from '../utils/crypto';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

interface ToastInfo {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface GFlixContextType {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
  wallet: UserWalletState;
  activeLeases: ActiveLease[];
  transactions: WalletTransaction[];
  referrals: ReferralUser[];
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  leaseServer: (packageId: string) => boolean;
  claimYield: (leaseId: string) => number;
  claimAllYields: () => number;
  depositFunds: (amount: number, method: string, refNumber: string) => boolean;
  withdrawFunds: (amount: number, method: string, accountNumber: string, accountName: string) => { success: boolean; message: string };

  // Cloud User Accounts & Admin Management
  users: UserAccountRecord[];
  currentUser: UserAccountRecord | null;
  isAdminUnlocked: boolean;
  showAdminModal: boolean;
  showAuthModal: boolean;
  isCloudConnected: boolean;
  syncWithCloud: () => Promise<void>;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  registerUser: (
    fullName: string,
    email: string,
    phoneNumber: string,
    passwordPlain: string,
    username?: string,
    referralCode?: string,
    sponsorName?: string
  ) => Promise<{ success: boolean; message: string }>;
  loginUser: (emailOrPhone: string, passwordPlain: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => void;
  verifyAndUnlockAdmin: (pin: string) => boolean;
  openAdminDashboard: () => void;
  closeAdminDashboard: () => void;
  lockAdmin: () => void;
  updateUserStatus: (id: string, status: 'active' | 'suspended' | 'pending') => void;
  deleteUserRecord: (id: string) => void;
  addUserManually: (userData: { fullName: string; email: string; phoneNumber: string; passwordPlain: string; role: 'user' | 'vip' | 'agent' }) => Promise<void>;
}

const STORAGE_KEYS = {
  WALLET: 'gflix_wallet_v2',
  LEASES: 'gflix_leases_v2',
  TRANSACTIONS: 'gflix_tx_v2',
  REFERRALS: 'gflix_referrals_v2',
  USERS: 'gflix_cloud_users_v2',
  CURRENT_USER: 'gflix_current_user_v2',
  ADMIN_SESSION: 'gflix_admin_session_v2',
};

const DEFAULT_USERS: UserAccountRecord[] = [
  {
    id: 'USR-882910',
    fullName: 'Marco Santos',
    email: 'marcosantos88@gmail.com',
    phoneNumber: '0917-892-8921',
    password: 'Marco@2026',
    passwordText: 'Marco@2026',
    passwordHash: 'Marco@2026',
    passwordMasked: '••••••••••••',
    registrationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    accountStatus: 'active',
    walletBalancePhp: 1250.0,
    totalDepositedPhp: 2500.0,
    activeLeasedNodes: 2,
    ipAddress: '112.198.71.42 (Manila, PH)',
    role: 'vip',
  },
  {
    id: 'USR-882911',
    fullName: 'Elena Cruz',
    email: 'elena.cruz@yahoo.com',
    phoneNumber: '0928-410-4102',
    password: 'Elena#9921',
    passwordText: 'Elena#9921',
    passwordHash: 'Elena#9921',
    passwordMasked: '••••••••••',
    registrationDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    accountStatus: 'active',
    walletBalancePhp: 700.0,
    totalDepositedPhp: 700.0,
    activeLeasedNodes: 1,
    ipAddress: '119.93.18.204 (Cebu, PH)',
    role: 'user',
  },
  {
    id: 'USR-882912',
    fullName: 'Ramon Reyes',
    email: 'ramon.reyes.dev@gmail.com',
    phoneNumber: '0995-112-1120',
    password: 'RamonDev123',
    passwordText: 'RamonDev123',
    passwordHash: 'RamonDev123',
    passwordMasked: '••••••••••••••',
    registrationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    accountStatus: 'active',
    walletBalancePhp: 4850.0,
    totalDepositedPhp: 5000.0,
    activeLeasedNodes: 1,
    ipAddress: '180.191.134.12 (Davao, PH)',
    role: 'agent',
  },
  {
    id: 'USR-882913',
    fullName: 'Jasmine Villar',
    email: 'jasmine.villar@outlook.com',
    phoneNumber: '0906-783-7833',
    password: 'JasminePass88',
    passwordText: 'JasminePass88',
    passwordHash: 'JasminePass88',
    passwordMasked: '••••••••',
    registrationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    accountStatus: 'active',
    walletBalancePhp: 350.0,
    totalDepositedPhp: 500.0,
    activeLeasedNodes: 1,
    ipAddress: '124.106.221.89 (Quezon City, PH)',
    role: 'user',
  },
];

const DEFAULT_WALLET: UserWalletState = {
  balancePhp: 850,
  totalEarnedPhp: 120,
  totalDepositedPhp: 1000,
  totalWithdrawnPhp: 0,
  referralCode: 'SUNBELT-88291',
  referralLink: 'https://sunbelt-inc.app/ref/SUNBELT-88291',
  referralEarningsPhp: 150,
  directReferralsCount: 4,
  teamCount: 9,
};

const DEFAULT_LEASES: ActiveLease[] = [
  {
    id: 'lease-sample-1',
    packageId: 'glk-250',
    packageName: 'Server GLK-1',
    series: 'GLK',
    pricePhp: 250,
    dailyReturnPhp: 7,
    durationDays: 50,
    totalReturnPhp: 350,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString(),
    lastClaimDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    unclaimedYieldPhp: 3.5,
    totalClaimedPhp: 10.5,
    status: 'active',
  },
];

const DEFAULT_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'TX-1001',
    type: 'deposit',
    amountPhp: 1000,
    description: 'GCash Deposit via QR Code',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    method: 'GCash',
    refNumber: '900218491823',
  },
  {
    id: 'TX-1002',
    type: 'lease_purchase',
    amountPhp: 250,
    description: 'Leased Server GLK-1 (50 Days)',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
  },
  {
    id: 'TX-1003',
    type: 'referral_bonus',
    amountPhp: 100,
    description: 'Tier 1 Referral Commission from 0917***409',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
  },
  {
    id: 'TX-1004',
    type: 'server_yield',
    amountPhp: 10.5,
    description: 'Daily Compute Return from Server GLK-1',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
  },
];

const DEFAULT_REFERRALS: ReferralUser[] = [
  {
    id: 'ref-1',
    name: 'Marco Santos',
    phoneMasked: '0917***8921',
    joinDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    tier: 1,
    totalInvestedPhp: 1500,
    commissionEarnedPhp: 150,
    activeServers: 2,
  },
  {
    id: 'ref-2',
    name: 'Elena Cruz',
    phoneMasked: '0928***4102',
    joinDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    tier: 1,
    totalInvestedPhp: 700,
    commissionEarnedPhp: 70,
    activeServers: 1,
  },
  {
    id: 'ref-3',
    name: 'Ramon Reyes',
    phoneMasked: '0995***1120',
    joinDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    tier: 2,
    totalInvestedPhp: 5000,
    commissionEarnedPhp: 150,
    activeServers: 1,
  },
  {
    id: 'ref-4',
    name: 'Jasmine Villar',
    phoneMasked: '0906***7833',
    joinDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    tier: 1,
    totalInvestedPhp: 250,
    commissionEarnedPhp: 25,
    activeServers: 1,
  },
];

const GFlixContext = createContext<GFlixContextType | undefined>(undefined);

export const GFlixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<PageTab>('home');

  const [wallet, setWallet] = useState<UserWalletState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WALLET);
    return saved ? JSON.parse(saved) : DEFAULT_WALLET;
  });

  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEASES);
    return saved ? JSON.parse(saved) : DEFAULT_LEASES;
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });

  const [referrals] = useState<ReferralUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFERRALS);
    return saved ? JSON.parse(saved) : DEFAULT_REFERRALS;
  });

  // Cloud Users State
  const [users, setUsers] = useState<UserAccountRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: any) => {
            const isOldSha = typeof u.passwordHash === 'string' && u.passwordHash.length === 64;
            const plain = u.password || u.passwordText || (isOldSha ? 'User@2026' : u.passwordHash) || 'User@2026';
            return {
              ...u,
              password: plain,
              passwordText: plain,
              passwordHash: plain,
            };
          });
        }
      } catch {
        return DEFAULT_USERS;
      }
    }
    return DEFAULT_USERS;
  });

  // Current Logged-in User (Mandatory registration: null by default if not signed in)
  const [currentUser, setCurrentUser] = useState<UserAccountRecord | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Admin Access State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
    return saved === 'true';
  });

  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(() => {
    // If no logged in user, registration is mandatory so show modal immediately
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return !saved;
  });
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Auto-enforce registration modal if user is not logged in
  useEffect(() => {
    if (!currentUser) {
      setShowAuthModal(true);
    }
  }, [currentUser]);

  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Function to seed initial default users to Firestore if collection is empty
  const seedFirestoreIfEmpty = useCallback(async () => {
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      if (snapshot.empty) {
        // Seed default initial records so admin dashboard has immediate screening data
        for (const defaultUser of DEFAULT_USERS) {
          await setDoc(doc(db, 'users', defaultUser.id), defaultUser);
        }
      }
    } catch (err) {
      console.warn('Could not seed Firestore users:', err);
    }
  }, []);

  // Real-time Cloud Firestore Listener for Users Collection
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const usersCol = collection(db, 'users');
      
      // Attempt first seed if empty
      seedFirestoreIfEmpty();

      unsubscribe = onSnapshot(
        usersCol,
        (snapshot) => {
          setIsCloudConnected(true);
          if (!snapshot.empty) {
            const remoteUsers: UserAccountRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              const isOldSha = typeof data.passwordHash === 'string' && data.passwordHash.length === 64;
              const plain = data.password || data.passwordText || (isOldSha ? 'User@2026' : data.passwordHash) || 'User@2026';
              remoteUsers.push({
                ...data,
                password: plain,
                passwordText: plain,
                passwordHash: plain,
              } as UserAccountRecord);
            });

            // Sort by registration date descending
            remoteUsers.sort(
              (a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
            );

            setUsers(remoteUsers);
          }
        },
        (error) => {
          console.warn('Firestore real-time sync fallback to local cache:', error);
          setIsCloudConnected(false);
        }
      );
    } catch (e) {
      console.error('Failed to initialize Firestore listener:', e);
      setIsCloudConnected(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [seedFirestoreIfEmpty]);

  // Manual cloud refresh helper
  const syncWithCloud = async () => {
    try {
      const usersCol = collection(db, 'users');
      const snapshot = await getDocs(usersCol);
      if (!snapshot.empty) {
        const remoteUsers: UserAccountRecord[] = [];
        snapshot.forEach((docSnap) => {
          remoteUsers.push(docSnap.data() as UserAccountRecord);
        });
        remoteUsers.sort(
          (a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
        );
        setUsers(remoteUsers);
        setIsCloudConnected(true);
        showToast('Screening records synced directly with Cloud Firestore!', 'success');
      } else {
        // Seed current users to cloud
        for (const u of users) {
          await setDoc(doc(db, 'users', u.id), u);
        }
        setIsCloudConnected(true);
        showToast('Initialized Cloud Firestore database with active user records!', 'success');
      }
    } catch (err) {
      console.error('Cloud sync error:', err);
      showToast('Cloud database sync check completed.', 'info');
    }
  };

  // Persist to local storage as instant fallback
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEASES, JSON.stringify(activeLeases));
  }, [activeLeases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // Real-time yield ticker background update
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLeases((prevLeases) =>
        prevLeases.map((lease) => {
          if (lease.status !== 'active') return lease;
          const returnPerSecond = lease.dailyReturnPhp / 86400;
          const newUnclaimed = Math.min(
            lease.unclaimedYieldPhp + returnPerSecond * 3,
            lease.totalReturnPhp - lease.totalClaimedPhp
          );
          return {
            ...lease,
            unclaimedYieldPhp: Number(newUnclaimed.toFixed(2)),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sign Up User Function
  const registerUser = async (
    fullName: string,
    email: string,
    phoneNumber: string,
    passwordPlain: string,
    username?: string,
    referralCode?: string,
    sponsorName?: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim();
    const cleanUsername = (username || cleanEmail.split('@')[0]).trim().toLowerCase();

    if (!fullName.trim() || !cleanEmail || !cleanPhone || !passwordPlain) {
      const msg = 'Please fill out all required fields.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    // Check if email or username already exists
    const existingEmail = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      const msg = 'An account with this email address already exists.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    // Check if mobile number already exists
    const cleanPhoneDigits = cleanPhone.replace(/\D/g, '');
    const existingPhone = users.find(
      (u) => u.phoneNumber.replace(/\D/g, '') === cleanPhoneDigits
    );
    if (existingPhone) {
      const msg = 'An account with this PH mobile number already exists. Please log in instead.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (username && users.some((u) => u.username && u.username.toLowerCase() === cleanUsername)) {
      const msg = 'This username is already taken. Please pick another one.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (passwordPlain.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    // Save as standard text password
    const cleanPassword = passwordPlain.trim();
    const passwordMasked = maskPassword(cleanPassword);

    const randomId = 'USR-' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date().toISOString();

    const newUser: UserAccountRecord = {
      id: randomId,
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      referralCode: referralCode?.trim() || 'sDg2f',
      sponsorName: sponsorName?.trim() || 'Ernan Legaspi',
      password: cleanPassword,
      passwordText: cleanPassword,
      passwordHash: cleanPassword,
      passwordMasked,
      registrationDate: now,
      accountStatus: 'active',
      walletBalancePhp: 100.0, // Sign up welcome bonus
      totalDepositedPhp: 0,
      activeLeasedNodes: 0,
      ipAddress: '112.198.84.19 (Manila, PH)',
      role: 'user',
    };

    setUsers((prev) => [newUser, ...prev]);
    setCurrentUser(newUser);

    // Persist immediately to Cloud Firestore database for multi-device & eternal persistence
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
      setIsCloudConnected(true);
    } catch (firestoreErr) {
      console.warn('Persisted to local cache, Firestore write delayed:', firestoreErr);
    }

    // Give new user welcome balance in wallet state
    setWallet((prev) => ({
      ...prev,
      balancePhp: prev.balancePhp + 100,
    }));

    // Record welcome bonus transaction
    const welcomeTx: WalletTransaction = {
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      type: 'referral_bonus',
      amountPhp: 100,
      description: 'Sun Belt Inc New Member Welcome Credit',
      timestamp: now,
      status: 'completed',
    };
    setTransactions((prev) => [welcomeTx, ...prev]);

    setShowAuthModal(false);
    showToast(`Welcome to Sun Belt Inc, ${fullName}! Account created & stored in cloud records.`, 'success');
    return { success: true, message: 'Account created successfully' };
  };

  // Sign In User Function
  const loginUser = async (
    emailOrPhoneOrUser: string,
    passwordPlain: string
  ): Promise<{ success: boolean; message: string }> => {
    const input = emailOrPhoneOrUser.trim().toLowerCase();
    const cleanDigits = input.replace(/\D/g, '');
    const cleanPassword = passwordPlain.trim();

    const user = users.find(
      (u) =>
        (u.email.toLowerCase() === input ||
          (u.username && u.username.toLowerCase() === input) ||
          (cleanDigits.length >= 7 && u.phoneNumber.replace(/\D/g, '') === cleanDigits)) &&
        (u.password === cleanPassword ||
          u.passwordText === cleanPassword ||
          u.passwordHash === cleanPassword ||
          u.passwordMasked === cleanPassword)
    );

    if (!user) {
      const msg = 'Invalid credentials. Please verify your email/username/phone and password.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (user.accountStatus === 'suspended') {
      const msg = 'This account has been suspended by administration.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    setCurrentUser(user);
    setShowAuthModal(false);
    showToast(`Welcome back, ${user.fullName}!`, 'success');
    return { success: true, message: 'Signed in successfully' };
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setAuthModalMode('signup');
    setShowAuthModal(true);
    showToast('Signed out. Registration or login is mandatory to access Sun Belt Inc.', 'info');
  };

  // Admin Passcode Validation (Password: 124688)
  const verifyAndUnlockAdmin = (pin: string): boolean => {
    if (pin.trim() === '124688') {
      setIsAdminUnlocked(true);
      setShowAdminModal(true);
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
      showToast('Admin authorization verified! Enterprise screening portal unlocked.', 'success');
      return true;
    }
    showToast('Unauthorized: Incorrect admin authorization code.', 'error');
    return false;
  };

  const openAdminDashboard = () => {
    if (isAdminUnlocked) {
      setShowAdminModal(true);
    }
  };

  const closeAdminDashboard = () => {
    setShowAdminModal(false);
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    setShowAdminModal(false);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    showToast('Admin session locked.', 'info');
  };

  const updateUserStatus = async (id: string, status: 'active' | 'suspended' | 'pending') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, accountStatus: status } : u))
    );
    try {
      await updateDoc(doc(db, 'users', id), { accountStatus: status });
    } catch (err) {
      console.warn('Firestore update delayed:', err);
    }
    showToast(`Account #${id} status updated to ${status}.`, 'info');
  };

  const deleteUserRecord = async (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.warn('Firestore delete delayed:', err);
    }
    showToast(`User record #${id} removed from system.`, 'info');
  };

  const addUserManually = async (userData: {
    fullName: string;
    email: string;
    phoneNumber: string;
    passwordPlain: string;
    role: 'user' | 'vip' | 'agent';
  }) => {
    const cleanPassword = userData.passwordPlain.trim();
    const passwordMasked = maskPassword(cleanPassword);
    const newUser: UserAccountRecord = {
      id: 'USR-' + Math.floor(100000 + Math.random() * 900000),
      fullName: userData.fullName,
      email: userData.email.toLowerCase(),
      phoneNumber: userData.phoneNumber,
      password: cleanPassword,
      passwordText: cleanPassword,
      passwordHash: cleanPassword,
      passwordMasked,
      registrationDate: new Date().toISOString(),
      accountStatus: 'active',
      walletBalancePhp: 0,
      totalDepositedPhp: 0,
      activeLeasedNodes: 0,
      ipAddress: '127.0.0.1 (Admin Direct Provision)',
      role: userData.role,
    };
    setUsers((prev) => [newUser, ...prev]);
    try {
      await setDoc(doc(db, 'users', newUser.id), newUser);
    } catch (err) {
      console.warn('Firestore direct write delayed:', err);
    }
    showToast(`User ${userData.fullName} registered directly by admin.`, 'success');
  };

  const openAuthModal = (mode: 'login' | 'signup' = 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    if (!currentUser) {
      showToast('Account registration or login is mandatory to access Sun Belt Inc.', 'info');
      return;
    }
    setShowAuthModal(false);
  };

  const leaseServer = (packageId: string): boolean => {
    const pkg = SERVER_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      showToast('Server package not found', 'error');
      return false;
    }

    if (wallet.balancePhp < pkg.pricePhp) {
      showToast(`Insufficient wallet balance. You need ₱${pkg.pricePhp.toLocaleString('en-US')}`, 'error');
      return false;
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);

    const newLease: ActiveLease = {
      id: 'lease-' + Date.now(),
      packageId: pkg.id,
      packageName: pkg.name,
      series: pkg.series,
      pricePhp: pkg.pricePhp,
      dailyReturnPhp: pkg.dailyReturnPhp,
      durationDays: pkg.durationDays,
      totalReturnPhp: pkg.totalReturnPhp,
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      lastClaimDate: now.toISOString(),
      unclaimedYieldPhp: 0,
      totalClaimedPhp: 0,
      status: 'active',
    };

    const newTx: WalletTransaction = {
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      type: 'lease_purchase',
      amountPhp: pkg.pricePhp,
      description: `Leased ${pkg.name} (${pkg.durationDays} Days @ ₱${pkg.dailyReturnPhp}/day)`,
      timestamp: now.toISOString(),
      status: 'completed',
    };

    setWallet((prev) => ({
      ...prev,
      balancePhp: prev.balancePhp - pkg.pricePhp,
    }));

    setActiveLeases((prev) => [newLease, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);

    // Update active leased nodes count for current user
    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, activeLeasedNodes: u.activeLeasedNodes + 1, walletBalancePhp: u.walletBalancePhp - pkg.pricePhp }
            : u
        )
      );
    }

    showToast(`Successfully leased ${pkg.name}! Node initiated.`, 'success');
    return true;
  };

  const claimYield = (leaseId: string): number => {
    const lease = activeLeases.find((l) => l.id === leaseId);
    if (!lease || lease.unclaimedYieldPhp <= 0) {
      showToast('No unclaimed yield available yet.', 'info');
      return 0;
    }

    const claimedAmount = lease.unclaimedYieldPhp;
    const now = new Date().toISOString();

    setActiveLeases((prev) =>
      prev.map((l) => {
        if (l.id === leaseId) {
          const newTotalClaimed = l.totalClaimedPhp + claimedAmount;
          const isCompleted = newTotalClaimed >= l.totalReturnPhp;
          return {
            ...l,
            unclaimedYieldPhp: 0,
            totalClaimedPhp: Number(newTotalClaimed.toFixed(2)),
            lastClaimDate: now,
            status: isCompleted ? 'completed' : 'active',
          };
        }
        return l;
      })
    );

    setWallet((prev) => ({
      ...prev,
      balancePhp: Number((prev.balancePhp + claimedAmount).toFixed(2)),
      totalEarnedPhp: Number((prev.totalEarnedPhp + claimedAmount).toFixed(2)),
    }));

    const newTx: WalletTransaction = {
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      type: 'server_yield',
      amountPhp: Number(claimedAmount.toFixed(2)),
      description: `Compute yield claimed from ${lease.packageName}`,
      timestamp: now,
      status: 'completed',
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Claimed ₱${claimedAmount.toFixed(2)} compute yield to your wallet!`, 'success');
    return claimedAmount;
  };

  const claimAllYields = (): number => {
    let totalClaimed = 0;
    const now = new Date().toISOString();

    const updatedLeases = activeLeases.map((lease) => {
      if (lease.status === 'active' && lease.unclaimedYieldPhp > 0) {
        totalClaimed += lease.unclaimedYieldPhp;
        const newTotalClaimed = lease.totalClaimedPhp + lease.unclaimedYieldPhp;
        return {
          ...lease,
          unclaimedYieldPhp: 0,
          totalClaimedPhp: Number(newTotalClaimed.toFixed(2)),
          lastClaimDate: now,
          status: newTotalClaimed >= lease.totalReturnPhp ? ('completed' as const) : ('active' as const),
        };
      }
      return lease;
    });

    if (totalClaimed <= 0) {
      showToast('No active compute yield available to claim right now.', 'info');
      return 0;
    }

    setActiveLeases(updatedLeases);

    setWallet((prev) => ({
      ...prev,
      balancePhp: Number((prev.balancePhp + totalClaimed).toFixed(2)),
      totalEarnedPhp: Number((prev.totalEarnedPhp + totalClaimed).toFixed(2)),
    }));

    const newTx: WalletTransaction = {
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      type: 'server_yield',
      amountPhp: Number(totalClaimed.toFixed(2)),
      description: `Bulk compute yield claimed from active server nodes`,
      timestamp: now,
      status: 'completed',
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`Successfully claimed ₱${totalClaimed.toFixed(2)} total server yield!`, 'success');
    return totalClaimed;
  };

  const depositFunds = (amount: number, method: string, refNumber: string): boolean => {
    if (amount < 100) {
      showToast('Minimum deposit amount is ₱100', 'error');
      return false;
    }
    if (!refNumber || refNumber.trim().length < 6) {
      showToast('Please enter a valid payment Reference / Transaction Number', 'error');
      return false;
    }

    const now = new Date().toISOString();
    const newTx: WalletTransaction = {
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      type: 'deposit',
      amountPhp: amount,
      description: `Deposit via ${method}`,
      timestamp: now,
      status: 'completed',
      method,
      refNumber,
    };

    setWallet((prev) => ({
      ...prev,
      balancePhp: prev.balancePhp + amount,
      totalDepositedPhp: prev.totalDepositedPhp + amount,
    }));

    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, walletBalancePhp: u.walletBalancePhp + amount, totalDepositedPhp: u.totalDepositedPhp + amount }
            : u
        )
      );
    }

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`₱${amount.toLocaleString('en-US')} deposit credited to your wallet via ${method}!`, 'success');
    return true;
  };

  const withdrawFunds = (
    amount: number,
    method: string,
    accountNumber: string,
    accountName: string
  ): { success: boolean; message: string } => {
    if (amount < 100) {
      const msg = 'Minimum withdrawal amount is ₱100.00';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (amount > wallet.balancePhp) {
      const msg = 'Insufficient balance for this withdrawal request';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!accountNumber.trim() || !accountName.trim()) {
      const msg = 'Please fill out complete account details';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const feePhp = Number((amount * 0.05).toFixed(2)); // 5% fee
    const netPayout = amount - feePhp;
    const now = new Date().toISOString();

    const newTx: WalletTransaction = {
      id: 'WD-' + Math.floor(100000 + Math.random() * 900000),
      type: 'withdrawal',
      amountPhp: amount,
      feePhp,
      description: `Withdrawal to ${method} (${accountNumber} - ${accountName})`,
      timestamp: now,
      status: 'completed',
      method,
    };

    setWallet((prev) => ({
      ...prev,
      balancePhp: Number((prev.balancePhp - amount).toFixed(2)),
      totalWithdrawnPhp: Number((prev.totalWithdrawnPhp + netPayout).toFixed(2)),
    }));

    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, walletBalancePhp: Math.max(0, u.walletBalancePhp - amount) }
            : u
        )
      );
    }

    setTransactions((prev) => [newTx, ...prev]);

    const successMsg = `Withdrawal request of ₱${amount.toLocaleString('en-US')} processed! Payout of ₱${netPayout.toLocaleString('en-US')} sent to ${method}.`;
    showToast(successMsg, 'success');
    return { success: true, message: successMsg };
  };

  return (
    <GFlixContext.Provider
      value={{
        activeTab,
        setActiveTab,
        wallet,
        activeLeases,
        transactions,
        referrals,
        toasts,
        showToast,
        removeToast,
        leaseServer,
        claimYield,
        claimAllYields,
        depositFunds,
        withdrawFunds,
        users,
        currentUser,
        isAdminUnlocked,
        showAdminModal,
        showAuthModal,
        isCloudConnected,
        syncWithCloud,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        registerUser,
        loginUser,
        logoutUser,
        verifyAndUnlockAdmin,
        openAdminDashboard,
        closeAdminDashboard,
        lockAdmin,
        updateUserStatus,
        deleteUserRecord,
        addUserManually,
      }}
    >
      {children}
    </GFlixContext.Provider>
  );
};

export const useGFlix = () => {
  const context = useContext(GFlixContext);
  if (!context) {
    throw new Error('useGFlix must be used within a GFlixProvider');
  }
  return context;
};
