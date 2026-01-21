/**
 * X Algorithm Analysis Engine
 *
 * Based on: https://github.com/xai-org/x-algorithm
 *
 * This engine analyzes posts against documented X algorithm signals
 * and provides scoring and recommendations grounded in the official spec.
 */

// ============================================
// X ALGORITHM KNOWLEDGE BASE
// Source: xai-org/x-algorithm README.md & phoenix/README.md
// ============================================

export const X_ALGORITHM_SPEC = {
  /**
   * Phoenix Scorer Predictions
   * The Grok-based transformer predicts probabilities for these actions
   */
  predictions: {
    positive: [
      { id: 'P(favorite)', name: 'Like', weight: 'positive', description: 'User will like the post' },
      { id: 'P(reply)', name: 'Reply', weight: 'positive', description: 'User will reply to the post' },
      { id: 'P(repost)', name: 'Repost', weight: 'positive', description: 'User will repost/retweet' },
      { id: 'P(quote)', name: 'Quote Tweet', weight: 'positive', description: 'User will quote the post' },
      { id: 'P(click)', name: 'Click', weight: 'positive', description: 'User will click links' },
      { id: 'P(profile_click)', name: 'Profile Click', weight: 'positive', description: 'User will click author profile' },
      { id: 'P(video_view)', name: 'Video View', weight: 'positive', description: 'User will watch video' },
      { id: 'P(photo_expand)', name: 'Photo Expand', weight: 'positive', description: 'User will expand photos' },
      { id: 'P(share)', name: 'Share', weight: 'positive', description: 'User will share externally' },
      { id: 'P(dwell)', name: 'Dwell Time', weight: 'positive', description: 'User will spend time reading' },
      { id: 'P(follow_author)', name: 'Follow', weight: 'positive', description: 'User will follow author' }
    ],
    negative: [
      { id: 'P(not_interested)', name: 'Not Interested', weight: 'negative', description: 'User marks as not interested' },
      { id: 'P(block_author)', name: 'Block', weight: 'negative', description: 'User blocks author' },
      { id: 'P(mute_author)', name: 'Mute', weight: 'negative', description: 'User mutes author' },
      { id: 'P(report)', name: 'Report', weight: 'negative', description: 'User reports post' }
    ]
  },

  /**
   * Scoring Formula
   * Final Score = Σ (weight_i × P(action_i))
   */
  scoringFormula: 'Final Score = Σ (weight_i × P(action_i))',

  /**
   * Pipeline Stages
   * From system architecture documentation
   */
  pipelineStages: [
    {
      name: 'Query Hydration',
      description: 'Fetch user context (engagement history, following list)'
    },
    {
      name: 'Candidate Sourcing',
      components: [
        { name: 'Thunder', type: 'In-Network', description: 'Recent posts from followed accounts' },
        { name: 'Phoenix Retrieval', type: 'Out-of-Network', description: 'ML-based similarity search across global corpus' }
      ]
    },
    {
      name: 'Candidate Hydration',
      description: 'Enrich with core post data, author info, media entities'
    },
    {
      name: 'Pre-Scoring Filters',
      filters: [
        'DropDuplicatesFilter',
        'CoreDataHydrationFilter',
        'AgeFilter',
        'SelfpostFilter',
        'RepostDeduplicationFilter',
        'IneligibleSubscriptionFilter',
        'PreviouslySeenPostsFilter',
        'PreviouslyServedPostsFilter',
        'MutedKeywordFilter',
        'AuthorSocialgraphFilter'
      ]
    },
    {
      name: 'Scoring',
      scorers: [
        { name: 'Phoenix Scorer', description: 'ML predictions from transformer model' },
        { name: 'Weighted Scorer', description: 'Combines predictions into final score' },
        { name: 'Author Diversity Scorer', description: 'Attenuates repeated author scores' },
        { name: 'OON Scorer', description: 'Adjusts for out-of-network content' }
      ]
    },
    {
      name: 'Selection',
      description: 'Sort by final score and select top K candidates'
    },
    {
      name: 'Post-Selection Filters',
      filters: [
        'VFFilter (deleted/spam/violence/gore)',
        'DedupConversationFilter'
      ]
    }
  ],

  /**
   * Key Design Decisions
   */
  designDecisions: [
    'No hand-engineered features - Grok transformer learns relevance from engagement sequences',
    'Candidate isolation in ranking - score for a post doesnt depend on other candidates in batch',
    'Hash-based embeddings for efficient lookup',
    'Multi-action prediction - predicts probabilities for many action types simultaneously',
    'Composable pipeline architecture with parallel execution'
  ],

  /**
   * Phoenix Architecture
   * Two-stage recommendation pipeline
   */
  phoenixArchitecture: {
    retrieval: {
      name: 'Two-Tower Model',
      userTower: 'Encodes user features and engagement history',
      candidateTower: 'Encodes all posts into embeddings',
      search: 'Top-K via dot product similarity'
    },
    ranking: {
      name: 'Transformer with Candidate Isolation',
      description: 'Candidates cannot attend to each other during inference',
      inputs: ['User embedding', 'History embeddings', 'Candidate embeddings'],
      outputs: '[B, num_candidates, num_actions] logits'
    }
  }
};

// ============================================
// ANALYSIS PATTERNS
// Derived from algorithm understanding
// ============================================

const PATTERNS = {
  // Patterns that boost P(reply)
  replyBoosters: [
    { pattern: /\?/, weight: 12, reason: 'Questions trigger reply behavior' },
    { pattern: /\b(what do you think|thoughts\?|agree\?|disagree\?)\b/i, weight: 8, reason: 'Direct conversation invitations' },
    { pattern: /\b(hot take|unpopular opinion)\b/i, weight: 6, reason: 'Debate-starting language' }
  ],

  // Patterns that boost P(click) / P(profile_click)
  clickBoosters: [
    { pattern: /\b(check out|try|join|see|discover|explore|grab|get|claim|learn more)\b/i, weight: 8, reason: 'Call-to-action verbs' },
    { pattern: /\b(link in bio|link below)\b/i, weight: 5, reason: 'Link reference' }
  ],

  // Patterns that boost P(favorite)
  favoriteBoosters: [
    { pattern: /\b(excited|huge|incredible|amazing|finally|love)\b/i, weight: 7, reason: 'Emotional resonance' },
    { pattern: /[\u{1F300}-\u{1F9FF}]/u, weight: 4, reason: 'Emoji engagement' }
  ],

  // Patterns that boost P(repost) / P(share)
  shareBoosters: [
    { pattern: /\b(thread|breakdown|guide|tips|how to)\b/i, weight: 8, reason: 'Shareable educational content' },
    { pattern: /\b(announcement|introducing|launching|releasing)\b/i, weight: 6, reason: 'News-worthy content' }
  ],

  // Patterns that boost P(follow_author)
  followBoosters: [
    { pattern: /\b(we|our|community|fam|frens)\b/i, weight: 6, reason: 'Community language' },
    { pattern: /\bgm\b/i, weight: 4, reason: 'GM culture participation' },
    { pattern: /\b(building|shipping|working on)\b/i, weight: 5, reason: 'Builder credibility' }
  ],

  // Patterns that trigger negative signals
  negativeTriggers: [
    { pattern: /\b(buy now|limited time|act now|dont miss)\b/i, weight: -15, signal: 'P(not_interested)', reason: 'Hard sell language' },
    { pattern: /\b(100x|guaranteed|free money|get rich)\b/i, weight: -20, signal: 'P(report)', reason: 'Scam-associated language' },
    { pattern: /\b(like if|rt if|retweet to|follow for|drop a)\b/i, weight: -12, signal: 'P(not_interested)', reason: 'Engagement bait' }
  ],

  // Patterns that risk MutedKeywordFilter
  mutedRiskPatterns: [
    { pattern: /\b(airdrop|whitelist|presale)\b/i, risk: 'high', reason: 'Commonly muted crypto terms' },
    { pattern: /\b(mint price|floor price|paper hands|diamond hands)\b/i, risk: 'medium', reason: 'NFT jargon' }
  ],

  // Spam indicators
  spamIndicators: [
    { check: (text) => (text.match(/#\w+/g) || []).length > 3, weight: -8, reason: 'Excessive hashtags' },
    { check: (text) => (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1) > 0.5, weight: -10, reason: 'Excessive caps' },
    { check: (text) => {
      const words = text.split(/\s+/);
      const freq = {};
      words.forEach(w => freq[w.toLowerCase()] = (freq[w.toLowerCase()] || 0) + 1);
      return Math.max(...Object.values(freq)) > 3 && words.length > 10;
    }, weight: -8, reason: 'Word repetition' }
  ]
};

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze a post against X algorithm factors
 * @param {string} text - The post text
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results
 */
export function analyzePost(text, options = {}) {
  const results = {
    text,
    charCount: text.length,
    wordCount: text.split(/\s+/).filter(w => w).length,
    scores: {},
    predictions: {},
    factors: [],
    recommendations: [],
    warnings: []
  };

  // Analyze for each prediction type
  analyzePredictions(text, results);

  // Analyze content quality
  analyzeContentQuality(text, results);

  // Analyze for negative signals
  analyzeNegativeSignals(text, results);

  // Analyze format
  analyzeFormat(text, options, results);

  // Calculate overall score
  calculateOverallScore(results);

  // Generate recommendations
  generateRecommendations(results, options);

  return results;
}

function analyzePredictions(text, results) {
  const predictions = {};

  // P(reply) analysis
  let replyScore = 30; // baseline
  PATTERNS.replyBoosters.forEach(({ pattern, weight, reason }) => {
    if (pattern.test(text)) {
      replyScore += weight;
      results.factors.push({ signal: 'P(reply)', impact: `+${weight}`, reason });
    }
  });
  predictions['P(reply)'] = Math.min(100, replyScore);

  // P(favorite) analysis
  let favoriteScore = 40;
  PATTERNS.favoriteBoosters.forEach(({ pattern, weight, reason }) => {
    if (pattern.test(text)) {
      favoriteScore += weight;
      results.factors.push({ signal: 'P(favorite)', impact: `+${weight}`, reason });
    }
  });
  predictions['P(favorite)'] = Math.min(100, favoriteScore);

  // P(click) / P(profile_click) analysis
  let clickScore = 25;
  PATTERNS.clickBoosters.forEach(({ pattern, weight, reason }) => {
    if (pattern.test(text)) {
      clickScore += weight;
      results.factors.push({ signal: 'P(click)', impact: `+${weight}`, reason });
    }
  });
  predictions['P(click)'] = Math.min(100, clickScore);

  // P(repost) / P(share) analysis
  let shareScore = 20;
  PATTERNS.shareBoosters.forEach(({ pattern, weight, reason }) => {
    if (pattern.test(text)) {
      shareScore += weight;
      results.factors.push({ signal: 'P(repost)', impact: `+${weight}`, reason });
    }
  });
  predictions['P(repost)'] = Math.min(100, shareScore);

  // P(follow_author) analysis
  let followScore = 25;
  PATTERNS.followBoosters.forEach(({ pattern, weight, reason }) => {
    if (pattern.test(text)) {
      followScore += weight;
      results.factors.push({ signal: 'P(follow_author)', impact: `+${weight}`, reason });
    }
  });
  predictions['P(follow_author)'] = Math.min(100, followScore);

  results.predictions = predictions;
}

function analyzeContentQuality(text, results) {
  let qualityScore = 60;

  // Information density
  if (/\b(new|update|launch|feature|announcing|introducing)\b/i.test(text)) {
    qualityScore += 10;
    results.factors.push({ signal: 'Content value', impact: '+10', reason: 'Informational content' });
  }

  // Specificity
  if (/\d+/.test(text)) {
    qualityScore += 8;
    results.factors.push({ signal: 'Specificity', impact: '+8', reason: 'Contains specific numbers/data' });
  }

  // Hook strength (first 120 chars)
  const hook = text.substring(0, 120);
  if (/^(NEW|BREAKING|HUGE|FINALLY|JUST|INTRODUCING)/i.test(hook)) {
    qualityScore += 8;
    results.factors.push({ signal: 'Hook strength', impact: '+8', reason: 'Strong opening word' });
  }

  results.scores.contentQuality = Math.max(0, Math.min(100, qualityScore));
}

function analyzeNegativeSignals(text, results) {
  let safetyScore = 100;

  // Check negative triggers
  PATTERNS.negativeTriggers.forEach(({ pattern, weight, signal, reason }) => {
    if (pattern.test(text)) {
      safetyScore += weight; // weight is negative
      results.factors.push({ signal, impact: `${weight}`, reason });
      results.warnings.push({ type: signal, message: reason });
    }
  });

  // Check spam indicators
  PATTERNS.spamIndicators.forEach(({ check, weight, reason }) => {
    if (check(text)) {
      safetyScore += weight;
      results.factors.push({ signal: 'Spam risk', impact: `${weight}`, reason });
      results.warnings.push({ type: 'spam', message: reason });
    }
  });

  // Check muted risk patterns
  PATTERNS.mutedRiskPatterns.forEach(({ pattern, risk, reason }) => {
    if (pattern.test(text)) {
      results.warnings.push({ type: 'MutedKeywordFilter risk', risk, message: reason });
    }
  });

  results.scores.safety = Math.max(0, safetyScore);
}

function analyzeFormat(text, options, results) {
  let formatScore = 50;

  const { mediaType = 'none' } = options;

  // Length optimization
  if (text.length >= 100 && text.length <= 200) {
    formatScore += 10;
    results.factors.push({ signal: 'Length', impact: '+10', reason: 'Optimal length (100-200 chars)' });
  } else if (text.length < 50) {
    formatScore -= 5;
    results.warnings.push({ type: 'length', message: 'Very short - may lack context' });
  }

  // Media type
  if (mediaType === 'video') {
    formatScore += 20;
    results.factors.push({ signal: 'P(video_view)', impact: '+20', reason: 'Video content' });
  } else if (mediaType === 'image') {
    formatScore += 15;
    results.factors.push({ signal: 'P(photo_expand)', impact: '+15', reason: 'Image content' });
  } else if (mediaType === 'thread') {
    formatScore += 10;
    results.factors.push({ signal: 'P(dwell)', impact: '+10', reason: 'Thread format' });
  }

  results.scores.format = Math.min(100, formatScore);
}

function calculateOverallScore(results) {
  // Weighted combination based on algorithm importance
  const weights = {
    predictions: 0.5,  // Core ML predictions are most important
    contentQuality: 0.2,
    format: 0.15,
    safety: 0.15
  };

  // Average of predictions
  const predictionValues = Object.values(results.predictions);
  const avgPrediction = predictionValues.reduce((a, b) => a + b, 0) / predictionValues.length;

  results.scores.overall = Math.round(
    avgPrediction * weights.predictions +
    (results.scores.contentQuality || 50) * weights.contentQuality +
    (results.scores.format || 50) * weights.format +
    (results.scores.safety || 100) * weights.safety
  );
}

function generateRecommendations(results, options) {
  const recs = [];

  // Low reply score
  if (results.predictions['P(reply)'] < 50 && !/\?/.test(results.text)) {
    recs.push({
      priority: 'high',
      action: 'Add a question',
      algorithmBenefit: 'Increases P(reply) prediction from Phoenix ranking model',
      example: 'End with "Thoughts?" or "What would you add?"'
    });
  }

  // No CTA
  if (results.predictions['P(click)'] < 40) {
    recs.push({
      priority: 'medium',
      action: 'Add a soft call-to-action',
      algorithmBenefit: 'Boosts P(click) and P(profile_click) in weighted scoring',
      example: 'Try "Check out...", "See more...", or "Explore..."'
    });
  }

  // Low share potential
  if (results.predictions['P(repost)'] < 40) {
    recs.push({
      priority: 'medium',
      action: 'Add shareable value',
      algorithmBenefit: 'Increases P(repost) and P(share) predictions',
      example: 'Include a tip, insight, or announcement worth sharing'
    });
  }

  // Format improvements
  if (results.text.length > 250 && options.mediaType !== 'thread') {
    recs.push({
      priority: 'low',
      action: 'Consider thread format',
      algorithmBenefit: 'Long-form content performs better as threads, increasing P(dwell)',
      example: 'Break into 2-4 connected tweets'
    });
  }

  // Community language
  if (results.predictions['P(follow_author)'] < 40) {
    recs.push({
      priority: 'low',
      action: 'Add community language',
      algorithmBenefit: 'Increases P(follow_author) prediction',
      example: 'Use "we", "our community", or inclusive language'
    });
  }

  results.recommendations = recs;
}

// ============================================
// OPTIMIZATION FUNCTIONS
// ============================================

/**
 * Generate optimized variants of a post
 * @param {string} text - Original post text
 * @param {Object} analysis - Analysis results
 * @param {Object} options - Optimization options
 * @returns {Array} Optimized variants
 */
export function generateOptimizedVariants(text, analysis, options = {}) {
  const variants = [];

  // Primary optimized version
  let primary = text.trim();

  // Add question if missing and low P(reply)
  if (analysis.predictions['P(reply)'] < 50 && !text.includes('?')) {
    primary += '\n\nThoughts?';
  }

  variants.push({
    type: 'Primary Optimized',
    content: primary,
    changes: getChanges(text, primary),
    expectedImpact: 'Balanced optimization for engagement'
  });

  // Conversation starter variant
  const convVariant = text.trim() + '\n\nWhat would you add? 👇';
  variants.push({
    type: 'Conversation Starter',
    content: convVariant,
    changes: ['Added direct reply invitation'],
    expectedImpact: 'Significantly increases P(reply)'
  });

  // Short punchy variant
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 1) {
    const shortVariant = sentences[0].trim() + '.\n\nMore soon 👀';
    variants.push({
      type: 'Short & Punchy',
      content: shortVariant,
      changes: ['Condensed to hook only', 'Added curiosity tease'],
      expectedImpact: 'Higher completion rate, builds anticipation'
    });
  }

  // Thread opener variant (if long)
  if (text.length > 150) {
    const threadOpener = '🧵 ' + sentences[0].trim() + '\n\n(1/' + Math.ceil(sentences.length / 2) + ')';
    variants.push({
      type: 'Thread Opener',
      content: threadOpener,
      changes: ['Reformatted as thread', 'Added thread markers'],
      expectedImpact: 'Increases P(click), P(dwell) for long-form'
    });
  }

  return variants;
}

function getChanges(original, modified) {
  const changes = [];
  if (modified.includes('?') && !original.includes('?')) {
    changes.push('Added question');
  }
  if (modified.length > original.length + 10) {
    changes.push('Added engagement hook');
  }
  if (changes.length === 0) {
    changes.push('Structure optimized');
  }
  return changes;
}

/**
 * Generate posting strategy recommendations
 * @param {Object} analysis - Analysis results
 * @param {Object} options - Strategy options
 * @returns {Object} Strategy recommendations
 */
export function generatePostingStrategy(analysis, options = {}) {
  const { hasLink, mediaType, goal } = options;

  const strategy = {
    format: 'single',
    formatReason: '',
    linkStrategy: null,
    linkReason: '',
    timing: [],
    followUp: []
  };

  // Format recommendation
  if (analysis.text?.length > 200 && mediaType !== 'thread') {
    strategy.format = 'thread';
    strategy.formatReason = 'Content length suggests thread format for better engagement';
  } else if (mediaType === 'video') {
    strategy.format = 'single';
    strategy.formatReason = 'Video content performs best as standalone post';
  } else {
    strategy.format = 'single';
    strategy.formatReason = 'Standard single post format';
  }

  // Link strategy
  if (hasLink) {
    if (goal === 'traffic') {
      strategy.linkStrategy = 'reply-link';
      strategy.linkReason = 'Put link in first reply to maximize main post reach while still driving clicks';
    } else {
      strategy.linkStrategy = 'bio-link';
      strategy.linkReason = 'Use "link in bio" to keep post clean for better in-feed performance';
    }
  }

  // Timing recommendations
  strategy.timing = [
    { time: '7-9am EST', reason: 'Peak morning engagement for US audiences' },
    { time: '12-1pm EST', reason: 'Lunch break scrolling peak' },
    { time: '6-8pm EST', reason: 'Evening wind-down peak' }
  ];

  // Follow-up engagement
  strategy.followUp = [
    { timing: '0-15 min', action: 'Reply to early commenters', reason: 'Early velocity signals quality' },
    { timing: '30 min', action: 'Quote tweet with additional context', reason: 'Creates second entry point' },
    { timing: '2-4 hours', action: 'Share related follow-up', reason: 'Maintains topic momentum' }
  ];

  return strategy;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  X_ALGORITHM_SPEC,
  analyzePost,
  generateOptimizedVariants,
  generatePostingStrategy
};
