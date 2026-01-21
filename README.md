# X Post Optimizer - Critters Quest Edition

A local-first desktop/web app that helps creators optimize posts for X (Twitter) using the **official xAI X-Algorithm documentation** as the single source of truth.

## 🎯 Core Goal

Transform raw post ideas into algorithm-aligned content with maximum reach potential—without spam, hacks, or guesswork. Every recommendation maps back to documented algorithm signals.

## 📚 Algorithm Source

All analysis is grounded in: **[github.com/xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)**

### Key Algorithm Components Used

#### Phoenix Scorer Predictions
The Grok-based transformer model predicts probabilities for these engagement types:

| Positive Signals | Negative Signals |
|-----------------|------------------|
| P(favorite) - Like | P(not_interested) |
| P(reply) - Reply | P(block_author) |
| P(repost) - Repost | P(mute_author) |
| P(quote) - Quote Tweet | P(report) |
| P(click) - Link Click | |
| P(profile_click) - Profile Visit | |
| P(video_view) - Video Watch | |
| P(photo_expand) - Image Expand | |
| P(share) - External Share | |
| P(dwell) - Time Spent | |
| P(follow_author) - Follow | |

#### Scoring Formula
```
Final Score = Σ (weight_i × P(action_i))
```
- Positive actions have positive weights
- Negative actions have negative weights

#### Pipeline Filters
- **AgeFilter** - Removes old posts
- **MutedKeywordFilter** - Removes posts with user's muted keywords
- **VFFilter** - Removes deleted/spam/violence/gore
- **RepostDeduplicationFilter** - Dedupes same content
- **AuthorDiversityScorer** - Prevents feed domination by single author

## 🚀 Quick Start

### Option 1: Open Directly
Simply open `index.html` in your browser. No build step required.

### Option 2: Local Server (Recommended)
```bash
cd x-post-optimizer
npx serve .
```
Then visit `http://localhost:3000`

### Option 3: Development Mode
```bash
npm install
npm run dev
```

## 📝 Usage

### 1. Enter Your Post Draft
Type or paste your post idea into the text area.

### 2. Configure Options
- **Goal**: Awareness, Traffic, Follows, or Engagement
- **Media Type**: Text Only, Image, Video, or Thread
- **Tone**: Announcement, GM Post, Lore/Story, Educational, Meme
- **Target Audience**: Existing Followers, Discovery, or Mixed
- **Contains External Link**: Toggle if your post includes a URL

### 3. Analyze & Optimize
Click the button to receive:

#### A. Quality Scorecard
- **Overall Virality Score** (0-100)
- Sub-scores for each algorithm domain:
  - Engagement (P(reply), P(favorite), etc.)
  - Content Quality
  - Format & Media
  - Link Handling
  - Timing
  - Safety Risk

#### B. Algorithm-Grounded Factors
Each detected pattern shows:
- Which prediction signal it affects
- The impact (positive or negative)
- Why it matters per the algorithm spec

#### C. Actionable Recommendations
- What to change and why
- Algorithm benefit explanation
- Concrete examples

#### D. Optimized Variants
- **Primary Optimized**: Balanced improvements
- **Conversation Starter**: Maximized P(reply)
- **Short & Punchy**: Higher completion rate
- **Thread Opener**: For long-form content

#### E. Posting Strategy
- Recommended format (single vs thread)
- Link placement strategy
- Follow-up engagement plan

## 🎮 Critters Quest Presets

Built-in templates for common Web3/game content:

| Preset | Use Case |
|--------|----------|
| Game Update | Feature releases, patches |
| Lore Drop | Story/narrative content |
| Community GM | Morning engagement posts |
| Big Announcement | Major news |
| Behind the Scenes | Build-in-public content |

## 🏗 Architecture

```
x-post-optimizer/
├── index.html           # Main app (standalone, no build)
├── lib/
│   └── algorithm-engine.js  # Core analysis module
├── package.json
└── README.md
```

### Core Analysis Engine

```javascript
import { analyzePost, generateOptimizedVariants } from './lib/algorithm-engine.js';

const analysis = analyzePost(postText, {
  goal: 'awareness',
  mediaType: 'image',
  hasLink: false
});

const variants = generateOptimizedVariants(postText, analysis);
```

### Extending the Engine

Add new patterns in `algorithm-engine.js`:

```javascript
// Add to PATTERNS object
const PATTERNS = {
  replyBoosters: [
    // Add new patterns that boost P(reply)
    { pattern: /your-regex/, weight: 10, reason: 'Why this helps' }
  ]
};
```

## 📊 Algorithm Domains Evaluated

### 1. Engagement Signals
- Question detection → P(reply)
- CTA language → P(click), P(profile_click)
- Conversation hooks → P(reply), P(quote)
- Emotional triggers → P(favorite), P(dwell)
- Community language → P(follow_author)

### 2. Content Quality
- Information density
- Specificity (numbers, data)
- Spam pattern detection
- Repetition check
- Caps ratio analysis

### 3. Media & Format
- Hook strength (first 120 chars)
- Media type scoring
- Length optimization
- Thread format detection

### 4. Link Handling
- External link penalties
- Link placement strategy
- Bio link alternatives
- Reply-link strategy

### 5. Timing & Velocity
- Time-relevant content
- GM culture patterns
- Early engagement strategy

### 6. Safety/Suppression Risk
- Hashtag overuse
- Engagement bait patterns
- Muted keyword risk
- Spam indicators

## 🛠 Technology Stack

- **Frontend**: React 18 (via CDN for zero-build)
- **Styling**: Tailwind CSS
- **Storage**: Local JSON (extensible to SQLite)
- **Build**: None required (open index.html directly)

## 📈 Extension Points

The app is designed for easy extension:

### Scheduling (Future)
```javascript
// Add to localStorage
const schedulePost = (post, datetime) => {
  const scheduled = JSON.parse(localStorage.getItem('scheduled') || '[]');
  scheduled.push({ post, datetime, id: crypto.randomUUID() });
  localStorage.setItem('scheduled', JSON.stringify(scheduled));
};
```

### Analytics Ingestion (Future)
```javascript
// Track post performance
const trackPost = (postId, metrics) => {
  const posts = JSON.parse(localStorage.getItem('posts') || '[]');
  const post = posts.find(p => p.id === postId);
  if (post) post.metrics = metrics;
  localStorage.setItem('posts', JSON.stringify(posts));
};
```

### A/B Testing (Future)
```javascript
// Compare variant performance
const abTest = {
  original: { impressions: 1000, engagement: 50 },
  variant: { impressions: 1200, engagement: 72 }
};
```

## ⚠️ Important Notes

- **Never recommends tactics that violate X rules**
- **Grounded in algorithm spec, not myths or outdated advice**
- **No generic "post better content" recommendations**
- **Every suggestion cites specific algorithm factors**

## 📖 Algorithm Reference

### Pipeline Flow (from documentation)
```
FOR YOU FEED REQUEST
       ↓
   HOME MIXER
       ↓
  QUERY HYDRATION
       ↓
 CANDIDATE SOURCES
  ├── THUNDER (In-Network)
  └── PHOENIX (Out-of-Network)
       ↓
   HYDRATION
       ↓
   FILTERING
       ↓
    SCORING
  ├── Phoenix Scorer (ML)
  ├── Weighted Scorer
  └── Author Diversity
       ↓
   SELECTION
       ↓
 POST-SELECTION FILTERS
       ↓
RANKED FEED RESPONSE
```

### Key Design Decisions (from spec)
1. No hand-engineered features - Grok transformer learns from engagement
2. Candidate isolation in ranking - scores are independent
3. Hash-based embeddings for efficient lookup
4. Multi-action prediction - predicts many engagement types at once
5. Composable pipeline architecture

## 📄 License

MIT - Build on this freely for your own projects.

---

Built with 🧠 by analyzing [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)
