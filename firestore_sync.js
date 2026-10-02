/**
 * Cloud Firestore Real-Time Synchronization Module
 * Connects student trading floors and teacher consoles across classroom laptops.
 */

const FirestoreSync = {
  db: null,
  isInitialized: false,
  activeListeners: [],

  init() {
    if (this.isInitialized) return true;

    try {
      if (typeof firebase !== 'undefined' && firebase.apps) {
        let app;
        if (!firebase.apps.length) {
          const cfg = (typeof CONFIG !== 'undefined' && CONFIG.FIREBASE_CONFIG)
            ? CONFIG.FIREBASE_CONFIG
            : (typeof DATATRENDS_CONFIG !== 'undefined' ? DATATRENDS_CONFIG.FIREBASE_CONFIG : null);

          if (cfg) {
            app = firebase.initializeApp(cfg);
          }
        } else {
          app = firebase.app();
        }

        if (app && firebase.firestore) {
          this.db = firebase.firestore();
          this.isInitialized = true;
          console.log('[FirestoreSync] Cloud Firestore initialized successfully.');
          return true;
        }
      }
    } catch (err) {
      console.warn('[FirestoreSync] Cloud Firestore initialization failed, using local storage fallback:', err);
    }

    return false;
  },

  getDocId(studentName, classCode) {
    const cleanClass = (classCode || 'COMMERCE2026').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanName = (studentName || 'anonymous').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${cleanClass}_${cleanName}`;
  },

  /**
   * Save student portfolio state to Cloud Firestore (with local fallback)
   */
  async saveStudentPortfolio(studentName, classCode, portfolio) {
    if (!studentName) return;

    // 1. Always persist to localStorage as immediate offline cache
    const storageKey = `portfolio_v1_${studentName.replace(/\s+/g, '_').toLowerCase()}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(portfolio));
    } catch (e) {}

    // 2. Cloud Firestore Real-Time Push
    if (this.init() && this.db) {
      try {
        const docId = this.getDocId(studentName, classCode);
        const currentEquity = (portfolio.equityHistory && portfolio.equityHistory.length > 0)
          ? portfolio.equityHistory[portfolio.equityHistory.length - 1].totalValue
          : (portfolio.cash || CONFIG.INITIAL_CASH);

        const payload = {
          studentName: studentName.trim(),
          classCode: (classCode || CONFIG.DEFAULT_CLASS_CODE).trim(),
          cash: Number((portfolio.cash || 0).toFixed(2)),
          totalValue: Number(currentEquity.toFixed(2)),
          tradesCount: (portfolio.trades || []).length,
          holdingsCount: (portfolio.holdings || []).length,
          holdings: portfolio.holdings || [],
          trades: portfolio.trades || [],
          journal: portfolio.journal || {},
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('sm_portfolios').doc(docId).set(payload, { merge: true });
      } catch (err) {
        console.warn('[FirestoreSync] Failed to push portfolio to Firestore:', err);
      }
    }
  },

  /**
   * Load student portfolio from Firestore or localStorage
   */
  async loadStudentPortfolio(studentName, classCode) {
    const storageKey = `portfolio_v1_${studentName.replace(/\s+/g, '_').toLowerCase()}`;
    let localData = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {}

    if (this.init() && this.db) {
      try {
        const docId = this.getDocId(studentName, classCode);
        const doc = await this.db.collection('sm_portfolios').doc(docId).get();
        if (doc.exists) {
          const remoteData = doc.data();
          // Merge remote with local if remote is richer
          if (remoteData && (remoteData.trades || []).length >= ((localData && localData.trades) ? localData.trades.length : 0)) {
            return remoteData;
          }
        }
      } catch (err) {
        console.warn('[FirestoreSync] Failed to load from Firestore, using local cache:', err);
      }
    }

    return localData;
  },

  /**
   * Subscribe to live class leaderboard in real-time
   */
  listenToClassLeaderboard(classCode, onUpdate) {
    if (!this.init() || !this.db) {
      // Fallback: poll localStorage
      const pollLocal = () => {
        const list = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('portfolio_v1_')) {
            try {
              const p = JSON.parse(localStorage.getItem(k));
              if (p && p.studentName) list.push(p);
            } catch (e) {}
          }
        }
        onUpdate(list);
      };
      pollLocal();
      const interval = setInterval(pollLocal, 5000);
      return () => clearInterval(interval);
    }

    try {
      let query = this.db.collection('sm_portfolios');
      if (classCode && classCode !== 'ALL') {
        query = query.where('classCode', '==', classCode.trim());
      }

      const unsubscribe = query.onSnapshot(snapshot => {
        const students = [];
        snapshot.forEach(doc => {
          students.push(doc.data());
        });
        onUpdate(students);
      }, err => {
        console.warn('[FirestoreSync] Leaderboard snapshot error, falling back to local:', err);
      });

      this.activeListeners.push(unsubscribe);
      return unsubscribe;
    } catch (err) {
      console.warn('[FirestoreSync] Could not attach leaderboard listener:', err);
      return () => {};
    }
  },

  /**
   * Broadcast a Macro Catalyst economic event to all students
   */
  async pushMacroCatalyst(catalyst) {
    if (this.init() && this.db) {
      try {
        await this.db.collection('sm_catalysts').add({
          id: catalyst.id,
          title: catalyst.title,
          summary: catalyst.summary,
          sectorImpact: catalyst.sectorImpact || {},
          prompt: catalyst.prompt || '',
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: Date.now()
        });
        return true;
      } catch (err) {
        console.warn('[FirestoreSync] Could not push catalyst to Firestore:', err);
      }
    }

    // Local fallback
    localStorage.setItem('dt_latest_catalyst', JSON.stringify({
      ...catalyst,
      createdAt: Date.now()
    }));
    return true;
  },

  /**
   * Listen for live Macro Catalyst economic shocks from the teacher
   */
  listenToMacroCatalysts(callback) {
    if (!this.init() || !this.db) {
      // Local check
      const checkLocal = () => {
        const raw = localStorage.getItem('dt_latest_catalyst');
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (Date.now() - (data.createdAt || 0) < 300000) {
              callback(data);
            }
          } catch (e) {}
        }
      };
      checkLocal();
      const interval = setInterval(checkLocal, 5000);
      return () => clearInterval(interval);
    }

    try {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      const unsubscribe = this.db.collection('sm_catalysts')
        .where('createdAt', '>=', tenMinutesAgo)
        .onSnapshot(snapshot => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              callback(change.doc.data());
            }
          });
        }, err => {
          console.warn('[FirestoreSync] Catalyst listener error:', err);
        });

      this.activeListeners.push(unsubscribe);
      return unsubscribe;
    } catch (err) {
      console.warn('[FirestoreSync] Could not attach catalyst listener:', err);
      return () => {};
    }
  },

  /**
   * Freeze or unfreeze trading for a class
   */
  async setRoundStatus(classCode, status) {
    const code = classCode || CONFIG.DEFAULT_CLASS_CODE;
    if (this.init() && this.db) {
      try {
        await this.db.collection('sm_classes').doc(code).set({
          status: status, // 'ACTIVE' | 'FROZEN' | 'COMPLETED'
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('[FirestoreSync] Could not update round status in Firestore:', err);
      }
    }
    localStorage.setItem(`sm_status_${code}`, status);
  },

  /**
   * Listen to trading freeze / active status
   */
  listenToRoundStatus(classCode, callback) {
    const code = classCode || CONFIG.DEFAULT_CLASS_CODE;
    if (!this.init() || !this.db) {
      const local = localStorage.getItem(`sm_status_${code}`) || 'ACTIVE';
      callback(local);
      return () => {};
    }

    try {
      const unsubscribe = this.db.collection('sm_classes').doc(code).onSnapshot(doc => {
        if (doc.exists && doc.data()) {
          callback(doc.data().status || 'ACTIVE');
        } else {
          callback('ACTIVE');
        }
      }, err => {
        console.warn('[FirestoreSync] Round status listener error:', err);
      });
      return unsubscribe;
    } catch (err) {
      return () => {};
    }
  },

  /**
   * Reset cohort roster
   */
  async resetClassRoster(classCode) {
    // 1. Clear local storage portfolios
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('portfolio_v1_') || k.startsWith('class_leaderboard_'))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));

    // 2. Cloud Firestore purge
    if (this.init() && this.db) {
      try {
        let query = this.db.collection('sm_portfolios');
        if (classCode && classCode !== 'ALL') {
          query = query.where('classCode', '==', classCode);
        }
        const snapshot = await query.get();
        const batch = this.db.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`[FirestoreSync] Cleared ${snapshot.size} student portfolios from Firestore.`);
      } catch (err) {
        console.warn('[FirestoreSync] Failed to purge Firestore class collection:', err);
      }
    }
  }
};
