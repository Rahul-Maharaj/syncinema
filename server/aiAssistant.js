/**
 * SyncCinema AI-Powered Watch Assistant
 * Provides spoiler-free synopses, scene explanations, intermission conversation cards,
 * and couple movie recommendations.
 */

const FAMOUS_MOVIES = {
  'la la land': {
    title: 'La La Land (2016)',
    genre: 'Musical Romance / Drama',
    mood: 'Bittersweet & Dreamy',
    rating: 'PG-13',
    runtime: '2h 8m',
    coupleScore: '98%',
    synopsis: 'A struggling jazz pianist (Ryan Gosling) and an aspiring actress (Emma Stone) fall in love while pursuing their passions in Los Angeles. As their careers blossom, they face painful choices between personal ambition and their devotion to each other.',
    themes: ['Following dreams vs. love', 'Artistic integrity', 'Timing and serendipity'],
    conversationStarters: [
      'If you had to choose between your greatest career dream and living near the love of your life, what would you do?',
      'Which musical melody in this movie touched your heart the most?',
      'Do you believe people can be right for each other even if the timing is wrong?'
    ],
    sceneGuide: {
      'planetarium': 'The Griffith Observatory waltz symbolizes their love transcending everyday gravity and reality.',
      'audition': 'Emma Stone’s song celebrates fools who dream, representing the vulnerable leap of love and art.',
      'epilogue': 'The final montage is an emotional exploration of "what could have been," showing mutual respect and lasting affection without bitterness.'
    }
  },
  'about time': {
    title: 'About Time (2013)',
    genre: 'Romance / Sci-Fi / Comedy',
    mood: 'Deeply Heartwarming & Tearjerker',
    rating: 'R',
    runtime: '2h 3m',
    coupleScore: '99%',
    synopsis: 'At the age of 21, Tim discovers that men in his family have the secret ability to travel back in time to past moments in their own lives. He uses this gift to win the heart of Mary, but soon learns that love and life’s hardest moments cannot simply be fixed by reliving them.',
    themes: ['Cherishing the ordinary day', 'Family devotion', 'Living life without a second chance'],
    conversationStarters: [
      'If you could travel back and relive any single day we spent together, which day would you pick?',
      'What small moment today made you happiest?',
      'What is your favorite family tradition or memory?'
    ],
    sceneGuide: {
      'tube': 'The London Underground montage shows the rhythm of growing together through small daily habits.',
      'father-beach': 'Tim’s final walk with his father represents true acceptance of time passing and love enduring.'
    }
  },
  'interstellar': {
    title: 'Interstellar (2014)',
    genre: 'Sci-Fi / Adventure / Drama',
    mood: 'Epic, Emotional & Mind-Bending',
    rating: 'PG-13',
    runtime: '2h 49m',
    coupleScore: '95%',
    synopsis: 'With Earth facing ecological collapse, a group of explorers travel through a wormhole near Saturn in search of a new home for humanity. Pilot Cooper must endure cosmic scale, relativistic time dilation, and the overwhelming pull of love across dimensions.',
    themes: ['Love transcends dimensions of time and space', 'Sacrifice for future generations', 'Relativity of human connection'],
    conversationStarters: [
      'Cooper lost decades in hours due to gravity. How do you feel about the phrase "Love is the one thing that transcends dimensions of time and space"?',
      'If we had to travel to another planet, what 3 personal items would you bring to remember our life?',
      'What was the most intense scene for you?'
    ],
    sceneGuide: {
      'tesseract': 'The 5th-dimensional structure represents physical time accessible through gravity, guided by Cooper’s love for Murph.',
      'water planet': 'Every hour on Miller’s planet equals 7 Earth years due to proximity to Gargantua’s event horizon.'
    }
  },
  'your name': {
    title: 'Your Name (Kimi no Na wa, 2016)',
    genre: 'Anime Romance / Fantasy',
    mood: 'Enchanting, Emotional & Romantic',
    rating: 'PG',
    runtime: '1h 47m',
    coupleScore: '99%',
    synopsis: 'Two high school students—a country girl and a city boy—mysteriously begin swapping bodies on alternate days. They form an intimate emotional connection through notes and messages, only to discover an astonishing cosmic anomaly connecting their fates.',
    themes: ['The red thread of destiny (Musubi)', 'Memory and distance', 'Searching for your other half'],
    conversationStarters: [
      'Do you believe some people are connected by an invisible thread before they even meet?',
      'If we woke up in each other\'s bodies for 24 hours, what would be the first thing you\'d do?',
      'What made you fall in love with my personality?'
    ],
    sceneGuide: {
      'twilight': 'Kataware-doki (the twilight hour) is the brief magical window between day and night where supernatural planes merge, allowing Taki and Mitsuha to meet face to face.',
      'braided cord': 'The kumihimo cord represents time itself—twisting, tangling, unraveling, and connecting again.'
    }
  },
  'knives out': {
    title: 'Knives Out (2019)',
    genre: 'Mystery / Comedy / Thriller',
    mood: 'Clever, Fun & Entertaining',
    rating: 'PG-13',
    runtime: '2h 10m',
    coupleScore: '96%',
    synopsis: 'When renowned crime novelist Harlan Thrombey is found dead at his estate, the eccentric detective Benoit Blanc is mysteriously enlisted to investigate. With an entire family of greedy suspects, every clue is wrapped in deceit.',
    themes: ['Greed and entitlement vs. genuine kindness', 'The art of deception', 'Truth prevails through unexpected humility'],
    conversationStarters: [
      'Who was your top suspect in the first 30 minutes?',
      'If we solved mysteries together like detectives, who would be the brains and who would be the interrogation expert?',
      'What is your favorite kind of plot twist?'
    ],
    sceneGuide: {
      'doughnut hole': 'Blanc’s monologue explains that an apparent flaw in a theory is just another smaller circle of mystery waiting to be resolved.',
      'mug': 'The final mug "My House, My Rules, My Coffee" is the ultimate symbolic passing of the torch.'
    }
  }
};

const RECOMMENDATIONS = {
  romantic: [
    { title: 'About Time (2013)', why: 'The ultimate couple tearjerker about cherishing every single day together.' },
    { title: 'La La Land (2016)', why: 'A visually breathtaking celebration of passion, music, and love in LA.' },
    { title: 'Your Name (2016)', why: 'An unforgettable anime romance woven with cosmic destiny and emotional depth.' },
    { title: 'Before Sunrise (1995)', why: 'Intimate, genuine, and pure romantic conversation through the streets of Vienna.' },
    { title: 'The Notebook (2004)', why: 'Classic enduring love story spanning decades and memories.' },
    { title: 'Past Lives (2023)', why: 'A tender, nuanced look at destiny (In-Yun) and connection across continents.' },
    { title: 'Palm Springs (2020)', why: 'Hilarious and charming romantic time-loop comedy perfect for cozy laughs.' }
  ],
  cozy: [
    { title: 'Spirited Away (2001)', why: 'Ghibli magic with unmatched warmth, beauty, and imaginative wonder.' },
    { title: 'Paddington 2 (2017)', why: 'Pure, wholesome joy that restores faith in kindness and good marmalade.' },
    { title: 'Amélie (2001)', why: 'Whimsical Paris adventure filled with quirky romance and sweet gestures.' },
    { title: 'The Grand Budapest Hotel (2014)', why: 'Wes Anderson’s colorful, delightfully charming comedic masterpiece.' },
    { title: 'Chef (2014)', why: 'Mouthwatering food, great music, and a father-son road trip that makes you smile.' }
  ],
  thrilling: [
    { title: 'Knives Out (2019)', why: 'The funnest modern whodunit mystery to guess the culprit together.' },
    { title: 'Inception (2010)', why: 'Mind-bending dream heists that will keep you pausing to debate theories.' },
    { title: 'A Quiet Place (2018)', why: 'Heart-pounding tension where holding each other’s hand is mandatory.' },
    { title: 'Shutter Island (2010)', why: 'Atmospheric psychological mystery with an unforgettable final question.' },
    { title: 'Parasite (2019)', why: 'Thrilling, unpredictable, and brilliantly crafted from start to finish.' }
  ],
  mindbending: [
    { title: 'Interstellar (2014)', why: 'Cosmic scale, breathtaking score, and profound emotional weight.' },
    { title: 'Arrival (2016)', why: 'Intelligent, deeply moving sci-fi about communication, time, and choice.' },
    { title: 'Eternal Sunshine of the Spotless Mind (2004)', why: 'Can love survive erasure? A surreal romantic journey through memories.' },
    { title: 'Everything Everywhere All at Once (2022)', why: 'Wild multiverse action with a heartwarming message about love and kindness.' }
  ],
  comedy: [
    { title: 'Game Night (2018)', why: 'Fast-paced, genuinely hilarious action comedy with great couple dynamics.' },
    { title: 'Crazy Rich Asians (2018)', why: 'Glitz, heart, hilarious family antics, and gorgeous Singapore romance.' },
    { title: 'The Nice Guys (2016)', why: 'Ryan Gosling and Russell Crowe have comedy chemistry off the charts.' },
    { title: 'Superbad (2007)', why: 'Nostalgic laugh-out-loud comedy that never gets old.' }
  ]
};

const INTERMISSION_QUESTIONS = [
  'What is the sweetest thing your partner did for you this past month?',
  'If you were trapped in the world of this movie, who would survive longer?',
  'What snack or drink would make this movie night 10/10 right now?',
  'Rate your date night comfort right now on a scale of 1 to 100!',
  'What made you choose this movie tonight, and is it living up to your expectations?',
  'If we could pause time right now for 2 hours, what would we do together?',
  'Which character in this story reminds you most of either of us?',
  'What is the next country or city you want us to travel to together?'
];

function cleanTitle(raw) {
  if (!raw) return 'Unknown Title';
  let t = String(raw).trim();
  // Strip url parts if any
  try {
    if (t.startsWith('http')) {
      const u = new URL(t);
      t = u.pathname.split('/').pop() || t;
    }
  } catch {}
  // Strip extensions
  t = t.replace(/\.(mp4|mkv|webm|avi|mov|m3u8|mpd)$/i, '');
  // Strip release tags (1080p, 720p, bluray, x264, web-dl, etc.)
  t = t.replace(/[\.\-_]/g, ' ');
  t = t.replace(/\b(1080p|720p|480p|2160p|4k|bluray|brrip|web-?dl|webrip|x264|x265|hevc|aac|dts|yify|rarbg|eztv|proper|repack)\b.*/i, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t || 'Movie';
}

function findMovieMatch(title) {
  const norm = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  for (const [key, data] of Object.entries(FAMOUS_MOVIES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return data;
    }
  }
  return null;
}

function handleAiQuery(action, payload = {}) {
  const rawTitle = payload.title || payload.mediaName || payload.src || '';
  const cleaned = cleanTitle(rawTitle);
  const match = findMovieMatch(cleaned);

  switch (action) {
    case 'identify': {
      if (match) {
        return {
          identified: true,
          title: match.title,
          genre: match.genre,
          mood: match.mood,
          runtime: match.runtime,
          rating: match.rating,
          coupleScore: match.coupleScore,
          synopsis: match.synopsis,
          themes: match.themes,
        };
      }
      return {
        identified: true,
        title: cleaned,
        genre: 'Feature Film / Video',
        mood: 'Exciting & Captivating',
        runtime: 'Feature Length',
        rating: 'NR',
        coupleScore: '95%',
        synopsis: `Enjoy watching "${cleaned}" together on SyncCinema. Settle into the virtual couch, dim the cinema lights, and share romantic reactions as the story unfolds.`,
        themes: ['Shared Experience', 'Cinema Magic', 'Quality Time Together'],
      };
    }

    case 'synopsis': {
      if (match) {
        return {
          title: match.title,
          synopsis: match.synopsis,
          themes: match.themes,
          spoilerFree: true,
        };
      }
      return {
        title: cleaned,
        synopsis: `"${cleaned}" takes viewers on a cinematic journey with captivating characters and memorable visual moments. Designed for a comfortable date night experience without unexpected plot spoilers.`,
        themes: ['Shared Journey', 'Emotion & Storytelling'],
        spoilerFree: true,
      };
    }

    case 'explain': {
      const topic = (payload.topic || '').toLowerCase();
      if (match?.sceneGuide) {
        for (const [k, expl] of Object.entries(match.sceneGuide)) {
          if (topic.includes(k) || k.includes(topic)) {
            return {
              title: match.title,
              topic: k,
              explanation: expl,
              hasSpoilers: false,
            };
          }
        }
      }
      return {
        title: cleaned,
        topic: payload.topic || 'Current Scene',
        explanation: `In this moment of "${cleaned}", the visual pacing and score emphasize the character emotional stakes. Key takeaway: Watch the subtle body language and reactions between the characters—it hints at the underlying tension before the next plot transition.`,
        hasSpoilers: false,
      };
    }

    case 'conversation': {
      const starters = match?.conversationStarters || INTERMISSION_QUESTIONS;
      const random = starters[Math.floor(Math.random() * starters.length)];
      return {
        title: cleaned,
        prompt: random,
        all: starters,
      };
    }

    case 'recommend': {
      const mood = (payload.mood || 'romantic').toLowerCase();
      const list = RECOMMENDATIONS[mood] || RECOMMENDATIONS.romantic;
      return {
        mood,
        recommendations: list,
      };
    }

    default:
      return { ok: true, message: 'AI Watch Assistant ready.' };
  }
}

module.exports = {
  handleAiQuery,
  cleanTitle,
  RECOMMENDATIONS,
  INTERMISSION_QUESTIONS,
};
