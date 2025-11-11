import fs from 'node:fs/promises';
import path from 'node:path';

const isDev = process.env.NODE_ENV === 'development';
const log = (...args) => isDev && console.log(...args);

export class UserProfileStore {
  #filePath;
  #data;

  constructor(baseDir = '.') {
    this.#filePath = path.join(baseDir, 'user-profile.json');
    this.#data = this.#getDefaultProfile();
  }

  #getDefaultProfile() {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    
    return {
      createdAt: now,
      lastActiveDate: today,
      totalWordsLearned: 0,        // Current word count in database (can decrease)
      totalWordsAdded: 0,           // Lifetime words added (never decreases, for achievements)
      totalSentencesScored: 0,      // Lifetime sentences scored
      goals: {
        dailyWords: 5,
        weeklyWords: 30
      },
      streaks: {
        current: 0,
        longest: 0,
        freezesAvailable: 2,
        lastStreakDate: null,
        history: []
      },
      achievements: [],
      stats: {
        byLevel: {
          A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0
        },
        byType: {
          noun: 0, verb: 0, adjective: 0, adverb: 0, other: 0
        }
      }
    };
  }

  setBaseDir(baseDir) {
    this.#filePath = path.join(baseDir, 'user-profile.json');
  }

  async init() {
    try {
      const content = await fs.readFile(this.#filePath, 'utf-8');
      this.#data = JSON.parse(content);
      
      // Migration: Add totalWordsAdded for existing profiles
      if (this.#data.totalWordsAdded === undefined) {
        this.#data.totalWordsAdded = this.#data.totalWordsLearned || 0;
        await this.#save();
        log('[UserProfileStore] Migrated profile: added totalWordsAdded =', this.#data.totalWordsAdded);
      }
      
      log('[UserProfileStore] Loaded profile from:', this.#filePath);
      log('[UserProfileStore] Profile stats:', {
        totalWordsLearned: this.#data.totalWordsLearned,
        totalWordsAdded: this.#data.totalWordsAdded,
        currentStreak: this.#data.streaks?.current,
        achievements: this.#data.achievements?.length
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        log('[UserProfileStore] No profile found, creating default');
        this.#data = this.#getDefaultProfile();
        await this.#save();
      } else {
        throw error;
      }
    }
  }

  async #save() {
    await fs.writeFile(this.#filePath, JSON.stringify(this.#data, null, 2), 'utf-8');
  }

  // Get profile
  async getProfile() {
    return { ...this.#data };
  }

  // Update activity for today
  async recordActivity(wordsAdded = 0, sentencesScored = 0) {
    const today = new Date().toISOString().split('T')[0];
    
    // Update last active date
    this.#data.lastActiveDate = today;
    
    // Update lifetime totals (these never decrease)
    this.#data.totalWordsAdded += wordsAdded;
    this.#data.totalSentencesScored += sentencesScored;
    
    // Note: totalWordsLearned is updated separately by updateStats() to reflect current DB count
    
    // Update or create today's history entry
    const todayEntry = this.#data.streaks.history.find(h => h.date === today);
    if (todayEntry) {
      todayEntry.wordsAdded += wordsAdded;
      todayEntry.sentencesScored += sentencesScored;
    } else {
      this.#data.streaks.history.push({
        date: today,
        wordsAdded,
        sentencesScored
      });
    }
    
    // Update streak (independent of word count)
    await this.#updateStreak(today);
    
    await this.#save();
    return this.#data;
  }

  async #updateStreak(today) {
    const lastStreakDate = this.#data.streaks.lastStreakDate;
    
    if (!lastStreakDate) {
      // First activity ever
      this.#data.streaks.current = 1;
      this.#data.streaks.longest = 1;
      this.#data.streaks.lastStreakDate = today;
      return;
    }
    
    // Already counted today
    if (lastStreakDate === today) {
      return;
    }
    
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastStreakDate === yesterdayStr) {
      // Continue streak
      this.#data.streaks.current += 1;
      this.#data.streaks.lastStreakDate = today;
      
      // Update longest if needed
      if (this.#data.streaks.current > this.#data.streaks.longest) {
        this.#data.streaks.longest = this.#data.streaks.current;
      }
    } else {
      // Streak broken (more than 1 day gap)
      this.#data.streaks.current = 1;
      this.#data.streaks.lastStreakDate = today;
    }
  }

  // Update stats from words
  async updateStats(words) {
    // Reset stats
    this.#data.stats.byLevel = {
      A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0
    };
    this.#data.stats.byType = {
      noun: 0, verb: 0, adjective: 0, adverb: 0, other: 0
    };
    
    // Count from words
    words.forEach(word => {
      // By level
      const level = (word.cefrLevel || '').toUpperCase();
      if (this.#data.stats.byLevel.hasOwnProperty(level)) {
        this.#data.stats.byLevel[level]++;
      }
      
      // By type
      const type = (word.wordType || 'other').toLowerCase();
      if (this.#data.stats.byType.hasOwnProperty(type)) {
        this.#data.stats.byType[type]++;
      } else {
        this.#data.stats.byType.other++;
      }
    });
    
    // Update current word count (can go up or down if user deletes words)
    this.#data.totalWordsLearned = words.length;
    
    // Ensure totalWordsAdded is at least as high as current count
    // (for backward compatibility with existing profiles)
    if (this.#data.totalWordsAdded < words.length) {
      this.#data.totalWordsAdded = words.length;
    }
    
    await this.#save();
    return this.#data.stats;
  }

  // Update goals
  async updateGoals(dailyWords, weeklyWords) {
    this.#data.goals.dailyWords = dailyWords;
    this.#data.goals.weeklyWords = weeklyWords;
    await this.#save();
    return this.#data.goals;
  }

  // Unlock achievement
  async unlockAchievement(achievementId) {
    const existing = this.#data.achievements.find(a => a.id === achievementId);
    if (!existing) {
      this.#data.achievements.push({
        id: achievementId,
        unlockedAt: new Date().toISOString()
      });
      await this.#save();
      return true;
    }
    return false;
  }

  // Check and unlock achievements based on current stats
  async checkAchievements() {
    const unlocked = [];
    
    log('[UserProfileStore] Checking achievements...', {
      totalWordsAdded: this.#data.totalWordsAdded,
      currentStreak: this.#data.streaks.current,
      existingAchievements: this.#data.achievements.length
    });
    
    // First word (use totalWordsAdded - lifetime metric)
    if (this.#data.totalWordsAdded >= 1) {
      if (await this.unlockAchievement('first_word')) {
        unlocked.push('first_word');
        log('[UserProfileStore] ✅ Unlocked: First Step!');
      }
    }
    
    // Vocabulary milestones (use totalWordsAdded - never decreases even if user deletes words)
    if (this.#data.totalWordsAdded >= 10 && await this.unlockAchievement('vocab_10')) {
      unlocked.push('vocab_10');
      log('[UserProfileStore] ✅ Unlocked: Learner!');
    }
    if (this.#data.totalWordsAdded >= 50 && await this.unlockAchievement('vocab_50')) {
      unlocked.push('vocab_50');
      log('[UserProfileStore] ✅ Unlocked: Bookworm!');
    }
    if (this.#data.totalWordsAdded >= 100 && await this.unlockAchievement('vocab_100')) {
      unlocked.push('vocab_100');
      log('[UserProfileStore] ✅ Unlocked: Scholar!');
    }
    if (this.#data.totalWordsAdded >= 500 && await this.unlockAchievement('vocab_500')) {
      unlocked.push('vocab_500');
      log('[UserProfileStore] ✅ Unlocked: Expert!');
    }
    if (this.#data.totalWordsAdded >= 1000 && await this.unlockAchievement('vocab_1000')) {
      unlocked.push('vocab_1000');
      log('[UserProfileStore] ✅ Unlocked: Master!');
    }
    
    // Streak milestones (independent of word count)
    if (this.#data.streaks.current >= 3 && await this.unlockAchievement('streak_3')) {
      unlocked.push('streak_3');
      log('[UserProfileStore] ✅ Unlocked: 3-Day Streak!');
    }
    if (this.#data.streaks.current >= 7 && await this.unlockAchievement('streak_7')) {
      unlocked.push('streak_7');
      log('[UserProfileStore] ✅ Unlocked: Week Warrior!');
    }
    if (this.#data.streaks.current >= 30 && await this.unlockAchievement('streak_30')) {
      unlocked.push('streak_30');
      log('[UserProfileStore] ✅ Unlocked: Month Master!');
    }
    if (this.#data.streaks.current >= 100 && await this.unlockAchievement('streak_100')) {
      unlocked.push('streak_100');
      log('[UserProfileStore] ✅ Unlocked: Century Club!');
    }
    
    // Perfect week (7 consecutive days with activity - independent of word count)
    const last7Days = this.#data.streaks.history.slice(-7);
    if (last7Days.length === 7 && last7Days.every(d => d.wordsAdded > 0 || d.sentencesScored > 0)) {
      if (await this.unlockAchievement('perfect_week')) {
        unlocked.push('perfect_week');
        log('[UserProfileStore] ✅ Unlocked: Perfect Week!');
      }
    }
    
    log('[UserProfileStore] Achievements check complete. Newly unlocked:', unlocked.length);
    
    return unlocked;
  }

  // Get activity history for last N days
  async getActivityHistory(days = 30) {
    return this.#data.streaks.history.slice(-days);
  }

  // Use streak freeze
  async useStreakFreeze() {
    if (this.#data.streaks.freezesAvailable > 0) {
      this.#data.streaks.freezesAvailable--;
      
      // Extend streak by marking yesterday as active
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayEntry = this.#data.streaks.history.find(h => h.date === yesterdayStr);
      if (!yesterdayEntry) {
        this.#data.streaks.history.push({
          date: yesterdayStr,
          wordsAdded: 0,
          sentencesScored: 0,
          frozen: true
        });
      }
      
      await this.#save();
      return true;
    }
    return false;
  }
}
