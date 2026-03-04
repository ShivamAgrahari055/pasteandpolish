/**
 * ============================================
 * Paste & Polish – script.js
 * AI to Human Text Converter
 * Pure client-side logic | No external APIs
 * ============================================
 */

'use strict';

// ============================================
// CONSTANTS & CONFIG
// ============================================

const MAX_CHARS = 5000;
const REWRITE_DELAY = 1600; // ms – simulates processing feel

// AI phrases to strip / replace
const AI_PATTERNS = [
  // Robotic openers
  { pattern: /\b(furthermore|moreover|additionally|in addition to this),?\s*/gi, replace: '' },
  { pattern: /\b(it is important to note that|it should be noted that|it is worth noting that)\b/gi, replace: '' },
  { pattern: /\b(in conclusion|to conclude|to summarize|in summary),?\s*/gi, replace: '' },
  { pattern: /\b(as (an AI|a language model|an artificial intelligence))[^.]*\./gi, replace: '' },
  { pattern: /\b(delve|delving)\b/gi, replace: 'explore' },
  { pattern: /\bcertainly,?\s*/gi, replace: '' },
  { pattern: /\bof course,?\s*/gi, replace: '' },
  { pattern: /\babsolutely,?\s*/gi, replace: '' },
  { pattern: /\bundoubtedly\b/gi, replace: 'clearly' },
  { pattern: /\bplethora\b/gi, replace: 'wide range' },
  { pattern: /\bmyriad (of)?\b/gi, replace: 'many' },
  { pattern: /\bafore?mentioned\b/gi, replace: 'this' },
  { pattern: /\bin (the )?light of\b/gi, replace: 'given' },
  { pattern: /\bit (goes without saying|stands to reason) that\b/gi, replace: '' },
  { pattern: /\bbe(?:ing)? mindful of the fact that\b/gi, replace: 'remembering that' },
  { pattern: /\bdue to the fact that\b/gi, replace: 'because' },
  { pattern: /\bin order to\b/gi, replace: 'to' },
  { pattern: /\bthe fact that\b/gi, replace: 'that' },
  { pattern: /\bit is (crucial|essential|imperative|vital) (to|that)\b/gi, replace: 'you should' },
  { pattern: /\bsignificantly\b/gi, replace: 'greatly' },
  { pattern: /\bsubstantially\b/gi, replace: 'a lot' },
  { pattern: /\bultimately\b/gi, replace: '' },
  { pattern: /\bin essence,?\s*/gi, replace: '' },
  { pattern: /\bfrom this (perspective|standpoint|vantage point)\b/gi, replace: 'here' },
  { pattern: /\btherefore,?\s*/gi, replace: 'so, ' },
  { pattern: /\bthus,?\s*/gi, replace: 'so, ' },
  { pattern: /\bhence,?\s*/gi, replace: 'so, ' },
  { pattern: /\bconsequently,?\s*/gi, replace: 'as a result, ' },
  // Bullet pattern -> inline prose
  { pattern: /^\s*[-•*]\s+(.+)$/gm, replace: '$1. ' },
  // Double spaces
  { pattern: /\s{2,}/g, replace: ' ' },
  // Multiple periods
  { pattern: /\.{2,}/g, replace: '.' },
];

// Sentence starters to add human variety
const CASUAL_STARTERS = [
  "Here's the thing —", "Honestly,", "Let me break it down:", "Think about it this way:",
  "The thing is,", "Here's what I mean:", "It's pretty simple, really.", "Quick heads-up:",
  "To be real with you,", "Just to be clear,", "Here's something worth knowing —",
];

const ACADEMIC_STARTERS = [
  "Research indicates that", "Evidence suggests that", "It has been observed that",
  "Studies demonstrate that", "Analysis reveals that", "Scholarly inquiry confirms that",
  "The prevailing consensus holds that", "Upon examination,",
];

const LEGAL_STARTERS = [
  "Pursuant to the foregoing,", "It is hereby established that", "The pertinent evidence indicates",
  "Notwithstanding the above,", "In accordance with established precedent,",
  "The documented record confirms that", "Under applicable standards,",
];

// ============================================
// DOM REFERENCES
// ============================================

const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const rewriteBtn = document.getElementById('rewriteBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearInput');
const toneSelect = document.getElementById('toneSelect');
const inputCounter = document.getElementById('inputCounter');
const inputWords = document.getElementById('inputWords');
const outputCounter = document.getElementById('outputCounter');
const outputWords = document.getElementById('outputWords');
const copyToast = document.getElementById('copyToast');
const btnLoader = document.getElementById('btnLoader');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const navbar = document.getElementById('navbar');

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Count words in a string
 */
function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Split text into sentences
 */
function toSentences(text) {
  // Split on sentence-ending punctuation, preserve punctuation
  return text
    .match(/[^.!?]*[.!?]+["']?|[^.!?]+$/g)
    ?.map(s => s.trim())
    .filter(Boolean) || [text.trim()];
}

/**
 * Strip AI patterns from raw text
 */
function stripAIPatterns(text) {
  let result = text;
  for (const { pattern, replace } of AI_PATTERNS) {
    result = result.replace(pattern, replace);
  }
  // Clean up extra spaces and trim
  result = result.replace(/\s+([.,;:])/g, '$1');   // space before punctuation
  result = result.replace(/([.!?])\s*([.!?])/g, '$1'); // double punctuation
  result = result.replace(/\s{2,}/g, ' ');
  result = result.trim();
  return result;
}

/**
 * Vary sentence structure – merge or split based on length
 */
function varySentenceFlow(sentences) {
  const result = [];
  let i = 0;

  while (i < sentences.length) {
    const s = sentences[i].trim();
    if (!s) { i++; continue; }

    const words = s.split(/\s+/);

    // Merge two very short sentences into one
    if (words.length < 6 && i + 1 < sentences.length) {
      const next = sentences[i + 1].trim();
      if (next && next.split(/\s+/).length < 8) {
        // Combine with semicolon
        result.push(capitalize(s.replace(/[.!?]+$/, '') + '; ' + next.charAt(0).toLowerCase() + next.slice(1)));
        i += 2;
        continue;
      }
    }

    // Break very long sentences at a conjunction
    if (words.length > 30) {
      const breakIdx = s.search(/,\s+(and|but|while|although|since|because|so)\s/i);
      if (breakIdx !== -1) {
        const first = s.slice(0, breakIdx + 1).trim();
        const second = capitalize(s.slice(breakIdx + 1).replace(/^(and|but|while|although|since|because|so)\s/i, '').trim());
        result.push(first, second);
        i++;
        continue;
      }
    }

    result.push(capitalize(s));
    i++;
  }

  return result;
}

// ============================================
// TONE ENGINE
// ============================================

/**
 * CASUAL BLOGGER TONE
 * Conversational, contractions, relatable starters
 */
function applyCasualTone(sentences) {
  const contractionMap = [
    [/\byou are\b/gi, "you're"],
    [/\byou have\b/gi, "you've"],
    [/\byou will\b/gi, "you'll"],
    [/\bit is\b/gi, "it's"],
    [/\bthat is\b/gi, "that's"],
    [/\bthey are\b/gi, "they're"],
    [/\bwe are\b/gi, "we're"],
    [/\bcannot\b/gi, "can't"],
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bis not\b/gi, "isn't"],
    [/\bwill not\b/gi, "won't"],
    [/\bhave not\b/gi, "haven't"],
    [/\bcould not\b/gi, "couldn't"],
    [/\bwould not\b/gi, "wouldn't"],
    [/\bshould not\b/gi, "shouldn't"],
    [/\bI am\b/gi, "I'm"],
    [/\bI have\b/gi, "I've"],
    [/\bI will\b/gi, "I'll"],
  ];

  return sentences.map((sentence, idx) => {
    let s = sentence;

    // Apply contractions
    for (const [pattern, replacement] of contractionMap) {
      s = s.replace(pattern, replacement);
    }

    // Add a casual starter every 4th sentence
    if (idx > 0 && idx % 4 === 0 && s.length > 20) {
      const starter = CASUAL_STARTERS[idx % CASUAL_STARTERS.length];
      s = `${starter} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    }

    // Soften some formal words
    s = s
      .replace(/\butilize\b/gi, 'use')
      .replace(/\bpurchase\b/gi, 'buy')
      .replace(/\bcommence\b/gi, 'start')
      .replace(/\bterminate\b/gi, 'end')
      .replace(/\brequire\b/gi, 'need')
      .replace(/\bobtain\b/gi, 'get')
      .replace(/\bprovide\b/gi, 'give')
      .replace(/\bsufficient\b/gi, 'enough')
      .replace(/\bprior to\b/gi, 'before')
      .replace(/\bsubsequent to\b/gi, 'after')
      .replace(/\binquire\b/gi, 'ask')
      .replace(/\battempt\b/gi, 'try');

    return s;
  });
}

/**
 * ACADEMIC TONE
 * Formal, structured, precise vocabulary
 */
function applyAcademicTone(sentences) {
  return sentences.map((sentence, idx) => {
    let s = sentence;

    // Replace casual shortenings with formal versions
    s = s
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bdon't\b/gi, 'do not')
      .replace(/\bdoesn't\b/gi, 'does not')
      .replace(/\bisn't\b/gi, 'is not')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\buse\b/gi, 'utilize')
      .replace(/\bget\b/gi, 'obtain')
      .replace(/\bshow\b/gi, 'demonstrate')
      .replace(/\bsay\b/gi, 'assert')
      .replace(/\bfind out\b/gi, 'ascertain')
      .replace(/\blook at\b/gi, 'examine')
      .replace(/\btry\b/gi, 'endeavour')
      .replace(/\bbig\b/gi, 'substantial')
      .replace(/\bgood\b/gi, 'favourable')
      .replace(/\bbad\b/gi, 'adverse')
      .replace(/\bproblem\b/gi, 'challenge')
      .replace(/\bhelp\b/gi, 'facilitate');

    // Add academic transition every 3 sentences
    if (idx > 0 && idx % 3 === 0 && s.length > 20) {
      const starter = ACADEMIC_STARTERS[idx % ACADEMIC_STARTERS.length];
      s = `${starter} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    }

    return s;
  });
}

/**
 * LEGAL PROFESSIONAL TONE
 * Precise, formal, authoritative vocabulary
 */
function applyLegalTone(sentences) {
  return sentences.map((sentence, idx) => {
    let s = sentence;

    s = s
      .replace(/\buse\b/gi, 'employ')
      .replace(/\bstart\b/gi, 'initiate')
      .replace(/\bend\b/gi, 'terminate')
      .replace(/\bsend\b/gi, 'transmit')
      .replace(/\bbuy\b/gi, 'acquire')
      .replace(/\bgive\b/gi, 'furnish')
      .replace(/\bask\b/gi, 'petition')
      .replace(/\btell\b/gi, 'notify')
      .replace(/\bshow\b/gi, 'demonstrate')
      .replace(/\bagree\b/gi, 'consent')
      .replace(/\bfix\b/gi, 'remedy')
      .replace(/\bcheck\b/gi, 'verify')
      .replace(/\bmake sure\b/gi, 'ensure')
      .replace(/\bget\b/gi, 'obtain')
      .replace(/\bnow\b/gi, 'at this juncture')
      .replace(/\bif\b/gi, 'in the event that')
      .replace(/\bbecause\b/gi, 'pursuant to the fact that')
      .replace(/\bafter\b/gi, 'subsequent to')
      .replace(/\bbefore\b/gi, 'prior to');

    // Add legal transitions every 3 sentences
    if (idx > 0 && idx % 3 === 0 && s.length > 20) {
      const starter = LEGAL_STARTERS[idx % LEGAL_STARTERS.length];
      s = `${starter} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    }

    return s;
  });
}

// ============================================
// MAIN REWRITE ENGINE
// ============================================

/**
 * Core rewrite function
 * @param {string} rawText - Original AI text
 * @param {string} tone - 'casual' | 'academic' | 'legal'
 * @returns {string} - Rewritten human-sounding text
 */
function rewriteText(rawText, tone) {
  // Step 1: Strip AI patterns
  let cleaned = stripAIPatterns(rawText);

  // Step 2: Split into sentences
  let sentences = toSentences(cleaned);

  // Step 3: Vary sentence flow
  sentences = varySentenceFlow(sentences);

  // Step 4: Apply tone
  switch (tone) {
    case 'academic':
      sentences = applyAcademicTone(sentences);
      break;
    case 'legal':
      sentences = applyLegalTone(sentences);
      break;
    case 'casual':
    default:
      sentences = applyCasualTone(sentences);
      break;
  }

  // Step 5: Reassemble into paragraphs
  // Group every ~3–4 sentences into a paragraph
  const paragraphs = [];
  const groupSize = tone === 'legal' ? 3 : tone === 'academic' ? 4 : 3;

  for (let i = 0; i < sentences.length; i += groupSize) {
    const group = sentences.slice(i, i + groupSize);
    // Ensure each sentence ends with punctuation
    const para = group
      .map(s => {
        s = s.trim();
        if (!s) return '';
        if (!/[.!?]$/.test(s)) s += '.';
        return s;
      })
      .filter(Boolean)
      .join(' ');
    if (para) paragraphs.push(para);
  }

  return paragraphs.join('\n\n');
}

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {

        faqItems.forEach(i => {
            if(i !== item){
                i.classList.remove("active");
            }
        });

        item.classList.toggle("active");
    });
});
// ============================================
// UI FUNCTIONS
// ============================================

/**
 * Update character and word counters for input
 */
function updateInputCounters() {
  const len = inputText.value.length;
  const words = countWords(inputText.value);

  inputCounter.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()} characters`;
  inputWords.textContent = `${words} word${words !== 1 ? 's' : ''}`;

  // Visual warnings
  inputCounter.classList.remove('near-limit', 'at-limit');
  if (len >= MAX_CHARS) {
    inputCounter.classList.add('at-limit');
  } else if (len >= MAX_CHARS * 0.85) {
    inputCounter.classList.add('near-limit');
  }

  // Enforce limit
  if (len > MAX_CHARS) {
    inputText.value = inputText.value.slice(0, MAX_CHARS);
  }
}

/**
 * Update output counters
 */
function updateOutputCounters(text) {
  const len = text.length;
  const words = countWords(text);
  outputCounter.textContent = `${len.toLocaleString()} characters`;
  outputWords.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

/**
 * Show the output text and hide placeholder
 */
function showOutput(text) {
  outputPlaceholder.style.display = 'none';
  outputText.style.display = 'block';
  outputText.value = text;
  updateOutputCounters(text);
  copyBtn.disabled = false;
  // Trigger fade-in animation
  outputText.style.animation = 'none';
  requestAnimationFrame(() => {
    outputText.style.animation = 'fadeInResult 0.5s ease both';
  });
}

/**
 * Reset output to placeholder state
 */
function resetOutput() {
  outputPlaceholder.style.display = 'flex';
  outputText.style.display = 'none';
  outputText.value = '';
  copyBtn.disabled = true;
  updateOutputCounters('');
}

/**
 * Show loading state on button
 */
function setLoading(isLoading) {
  if (isLoading) {
    rewriteBtn.classList.add('loading');
    rewriteBtn.disabled = true;
    rewriteBtn.setAttribute('aria-busy', 'true');
  } else {
    rewriteBtn.classList.remove('loading');
    rewriteBtn.disabled = false;
    rewriteBtn.setAttribute('aria-busy', 'false');
  }
}

/**
 * Show copy success toast
 */
let toastTimeout;
function showCopyToast() {
  copyToast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    copyToast.classList.remove('show');
  }, 2800);
}

/**
 * Handle copy to clipboard
 */
async function handleCopy() {
  const text = outputText.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    outputText.select();
    document.execCommand('copy');
  }

  // Visual feedback on button
  copyBtn.classList.add('copied');
  copyBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
    Copied!
  `;
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Copy
    `;
  }, 2500);

  showCopyToast();
}

/**
 * Handle the rewrite button click
 */
function handleRewrite() {
  const rawText = inputText.value.trim();

  if (!rawText) {
    // Shake effect on input
    inputText.style.animation = 'none';
    requestAnimationFrame(() => {
      inputText.style.animation = 'shake 0.4s ease';
    });
    inputText.focus();
    return;
  }

  const tone = toneSelect.value;

  setLoading(true);
  resetOutput();

  // Simulate processing with a short delay for UX feel
  setTimeout(() => {
    const result = rewriteText(rawText, tone);
    setLoading(false);
    showOutput(result);
  }, REWRITE_DELAY);
}

/**
 * Handle clear input
 */
function handleClear() {
  inputText.value = '';
  updateInputCounters();
  resetOutput();
  inputText.focus();
}

// ============================================
// INTERSECTION OBSERVER – FADE IN CARDS
// ============================================

function initFadeInObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          // Stagger each card with a delay
          const delay = idx * 80;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ============================================
// NAVBAR SCROLL & HAMBURGER
// ============================================

function initNavbar() {
  // Scroll shadow
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);

    // Update active nav link based on scroll position
    const sections = ['home', 'features', 'tool', 'upgrade'];
    let current = 'home';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${current}`);
    });
  }, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Close nav when a link is clicked (mobile)
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}

// Add shake keyframe dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);

// ============================================
// EVENT LISTENERS
// ============================================

function initApp() {
  // Input counter
  inputText.addEventListener('input', updateInputCounters);

  // Rewrite button
  rewriteBtn.addEventListener('click', handleRewrite);

  // Allow Ctrl+Enter to rewrite
  inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRewrite();
    }
  });

  // Copy button
  copyBtn.addEventListener('click', handleCopy);

  // Clear button
  clearBtn.addEventListener('click', handleClear);

  // Initialize counters
  updateInputCounters();
  updateOutputCounters('');

  // Fade-in observer
  initFadeInObserver();

  // Navbar behaviour
  initNavbar();

  console.log('✦ Paste & Polish loaded successfully.');
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

// ============================================
// 3D TILT ENGINE
// Mouse-tracked perspective tilt for all glass cards
// ============================================

(function init3DTilts() {
  // Selectors that get the tilt treatment
  const TILT_SELECTORS = [
    '.feature-card',
    '.tool-panel',
    '.upgrade-card',
    '.comparison-card',
  ];

  // Config
  const MAX_TILT = 10;   // max degrees of rotation
  const MAX_LIFT = 12;   // max px translate-Z lift
  const SCALE_ON = 1.03; // scale when tilting
  const SCALE_OFF = 1.0;

  /**
   * Wrap an element in a perspective container if not already wrapped
   */
  function ensureWrap(el) {
    if (el.parentElement.classList.contains('tilt-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'tilt-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
  }

  /**
   * Calculate tilt angles from mouse position relative to element center
   */
  function getTiltAngles(el, mouseX, mouseY) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (mouseX - cx) / (rect.width / 2); // -1 to 1
    const dy = (mouseY - cy) / (rect.height / 2); // -1 to 1
    return {
      rotateX: -dy * MAX_TILT,
      rotateY: dx * MAX_TILT,
    };
  }

  /**
   * Apply tilt on mouse enter / move
   */
  function onMove(e, el) {
    const { rotateX, rotateY } = getTiltAngles(el, e.clientX, e.clientY);
    el.style.transform =
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${MAX_LIFT}px) scale(${SCALE_ON})`;
    el.style.transition = 'transform 0.1s ease-out, box-shadow 0.35s ease, border-color 0.35s ease';

    // Dynamic highlight layer: create or update pseudo sheen based on mouse pos
    const rect = el.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const yPct = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    el.style.setProperty('--mx', `${xPct}%`);
    el.style.setProperty('--my', `${yPct}%`);
  }

  /**
   * Reset on mouse leave
   */
  function onLeave(el) {
    el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(${SCALE_OFF})`;
    el.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s ease, border-color 0.35s ease';
  }

  /**
   * Attach tilt listeners to each matched element
   */
  function attachTilt(el) {
    ensureWrap(el);

    el.addEventListener('mousemove', (e) => onMove(e, el));
    el.addEventListener('mouseleave', () => onLeave(el));

    // Touch support (mobile)
    el.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0], el);
    }, { passive: true });
    el.addEventListener('touchend', () => onLeave(el));
  }

  // Run after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    TILT_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(attachTilt);
    });
  });
})();

// ============================================
// PARALLAX BLOB MOUSE TRACKER
// Blobs drift gently toward the cursor
// ============================================

(function initParallax() {
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let rafId = null;

  const blobs = [
    { el: null, factor: 0.018 },
    { el: null, factor: -0.012 },
    { el: null, factor: 0.008 },
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    currentX = lerp(currentX, targetX, 0.07);
    currentY = lerp(currentY, targetY, 0.07);

    blobs.forEach(({ el, factor }) => {
      if (!el) return;
      const x = currentX * factor;
      const y = currentY * factor;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });

    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener('DOMContentLoaded', () => {
    blobs[0].el = document.querySelector('.blob-1');
    blobs[1].el = document.querySelector('.blob-2');
    blobs[2].el = document.querySelector('.blob-3');

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX - window.innerWidth / 2;
      targetY = e.clientY - window.innerHeight / 2;
    }, { passive: true });

    tick();
  });
})();

// ============================================
// SCROLL DEPTH 3D EFFECT
// Cards gently rise as they enter the viewport
// ============================================

(function initScrollDepth() {
  const DEPTH_SELECTORS = '.feature-card, .tool-panel, .upgrade-card, .comparison-card';

  function applyDepth(entries) {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        // Already tilting via mouse; just add a subtle base lift animation
        el.style.animation = 'cardRise 0.55s cubic-bezier(0.23,1,0.32,1) both';
      }
    });
  }

  const depthStyle = document.createElement('style');
  depthStyle.textContent = `
    @keyframes cardRise {
      from { opacity: 0; transform: perspective(900px) translateY(30px) translateZ(-30px) scale(0.97); }
      to   { opacity: 1; transform: perspective(900px) translateY(0)    translateZ(0)     scale(1);    }
    }
  `;
  document.head.appendChild(depthStyle);

  document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver(applyDepth, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px',
    });
    document.querySelectorAll(DEPTH_SELECTORS).forEach(el => observer.observe(el));
  });
})();

