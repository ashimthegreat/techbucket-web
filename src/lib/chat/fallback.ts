import "server-only";
import type { AiReply } from "./ai";
import type { Knowledge } from "./knowledge";

const STOP = new Set(
  "a an the is are do does you your we our i me my for of to in on and or with can how what which who when where much many it this that please about have has any".split(" "),
);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

const HUMAN = /\b(human|person|agent|someone|staff|call me|callback|call back|talk to|speak to|quote|quotation|price|pricing|cost|visit|demo|proposal)\b/i;
const HELLO = /^(hi|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b/i;

/** Simple keyword answers used when no AI key is set, the daily AI limit is reached, or the AI service fails. */
export function fallbackReply(k: Knowledge, text: string): AiReply {
  const base: AiReply = { message: "", cards: [], quickReplies: [], contact: {}, handoff: false, askContact: false };
  if (HELLO.test(text.trim()) && text.trim().split(/\s+/).length <= 3) {
    return {
      ...base,
      message: `Namaste! I can tell you about ${k.company}'s services or connect you with our team. What are you looking for?`,
      quickReplies: ["Our services", "Get a quote", "Talk to a person"],
    };
  }
  if (/^our services$/i.test(text.trim())) {
    const cards = [...k.cards.keys()].filter((id) => id.startsWith("service:")).slice(0, 3);
    return { ...base, message: "Here are some of the things we do. Tap one to read more, or tell me what you need.", cards, quickReplies: ["Get a quote", "Talk to a person"] };
  }
  if (HUMAN.test(text)) {
    return {
      ...base,
      message: "I'll connect you with our team. Please leave your name and email or phone so they can reply even if you leave this page.",
      handoff: true,
      askContact: true,
    };
  }
  const q = new Set(tokens(text));
  const score = (s: string) => tokens(s).reduce((n, w) => n + (q.has(w) ? 1 : 0), 0);
  const bestFaq = k.faqs.map((f) => ({ f, s: score(`${f.q} ${f.q}`) + score(f.a) * 0.3 })).sort((a, b) => b.s - a.s)[0];
  const bestCards = [...k.cards.entries()]
    .map(([id, c]) => ({ id, s: score(`${c.title} ${c.title} ${c.text}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.id);
  if (bestFaq && bestFaq.s >= 1.5) {
    return { ...base, message: bestFaq.f.a, cards: bestFaq.f.card ? [bestFaq.f.card] : bestCards, quickReplies: ["Get a quote", "Talk to a person"] };
  }
  if (bestCards.length) {
    return { ...base, message: "This may help. Tap to read more, or ask me to connect you with our team.", cards: bestCards, quickReplies: ["Get a quote", "Talk to a person"] };
  }
  return {
    ...base,
    message: `I'm not sure about that one. Our team can help: leave your details and they'll get back to you, or call ${k.phone}.`,
    quickReplies: ["Talk to a person", "Our services"],
    askContact: true,
  };
}
