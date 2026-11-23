import "server-only";
import type { AiReply } from "./ai";
import type { Knowledge } from "./knowledge";

/**
 * The guided assistant used when no AI key is set (or the daily AI limit is
 * reached). Menus of services, each service's FAQs as buttons, contact details,
 * and a quote / talk-to-a-person flow; typed questions are matched to FAQs and pages.
 */

const STOP = new Set(
  "a an the is are do does you your we our i me my for of to in on and or with can how what which who when where much many it this that please about have has any".split(" "),
);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

const norm = (s: string) => s.trim().toLowerCase().replace(/[?.!]+$/, "");
const HUMAN = /\b(human|person|agent|someone|staff|call me|callback|call back|talk to|speak to|quote|quotation|price|prices|pricing|cost|costs|rate|rates|how much|charge|charges|estimate|budget|visit|demo|proposal|tender|buy|purchase)\b/i;
const HELLO = /^(hi|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b/i;
const CONTACT = /\b(contact|address|location|where are you|office|phone|number|email|hours|open|timing)\b/i;
const THANKS = /^(thanks|thank you|ok|okay|great|cool|dhanyabad|dhanyavad)\b/i;

const MENU = ["Our services", "Get a quote", "Talk to a person", "Contact details"];

export function fallbackReply(k: Knowledge, text: string): AiReply {
  const base: AiReply = { message: "", cards: [], quickReplies: [], contact: {}, handoff: false, askContact: false };
  const t = norm(text);
  const short = t.split(/\s+/).length <= 4;

  // Buttons and short commands.
  if ((HELLO.test(t) && short) || t === "menu" || t === "main menu" || t === "start over") {
    return { ...base, message: `Namaste! How can ${k.company} help you today?`, quickReplies: MENU };
  }
  if (t === "our services" || t === "services" || t === "what do you do" || t === "see all services") {
    return {
      ...base,
      message: "Here's what we do. Pick one to learn more:",
      quickReplies: [...k.services.map((s) => s.title), "Talk to a person"],
    };
  }
  if (t === "contact details" || (CONTACT.test(t) && short)) {
    return { ...base, message: k.contactText, cards: ["page:contact"], quickReplies: ["Get a quote", "Talk to a person", "Main menu"] };
  }
  if (THANKS.test(t) && short) {
    return { ...base, message: "You're welcome! Anything else I can help with?", quickReplies: MENU };
  }

  // A service chosen from the menu.
  const svc = k.services.find((s) => norm(s.title) === t);
  if (svc) {
    return {
      ...base,
      message: svc.summary,
      cards: [svc.id],
      topic: svc.title,
      quickReplies: [...svc.faqs.slice(0, 4).map((f) => f.q), `Get a quote for ${svc.title}`.slice(0, 60), "See all services"],
    };
  }
  // An FAQ chosen from the buttons (or typed exactly).
  const faq = k.faqs.find((f) => norm(f.q) === t);
  if (faq) {
    const s = k.services.find((x) => x.id === faq.card);
    const more = s ? s.faqs.filter((f) => f.q !== faq.q).slice(0, 2).map((f) => f.q) : [];
    return { ...base, message: faq.a, cards: faq.card ? [faq.card] : [], quickReplies: [...more, "Get a quote", "Talk to a person"], topic: s?.title };
  }

  // Quote, price, visit, person.
  if (HUMAN.test(t)) {
    const about = t.match(/quote for (.+)$/)?.[1];
    return {
      ...base,
      message: `Happy to help${about ? ` with ${about}` : ""}. Prices depend on your site and requirements, so our team will prepare a quotation. Please leave your name and email or phone, and tell me briefly what you need.`,
      topic: about ? `Quote: ${about}` : "Quote / talk to the team",
      handoff: true,
      askContact: true,
    };
  }

  // Free text: closest FAQ, then closest pages.
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
    return { ...base, message: bestFaq.f.a, cards: bestFaq.f.card ? [bestFaq.f.card] : bestCards, quickReplies: ["Get a quote", "Talk to a person", "Main menu"] };
  }
  if (bestCards.length) {
    return {
      ...base,
      message: "These pages should help. Tap one to read more, or ask our team directly.",
      cards: bestCards,
      quickReplies: ["Get a quote", "Talk to a person", "Main menu"],
    };
  }
  return {
    ...base,
    message: `I don't have an answer for that, but our team will. Choose an option, or call ${k.phone}.`,
    quickReplies: MENU,
  };
}
