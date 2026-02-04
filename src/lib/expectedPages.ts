// src/lib/expectedPages.ts

export const RAW_PAGES: Record<string, string> = {
  alannafreeoftv: "Alanna Free / OFTV",
  alannapaid: "Alanna Paid",
  alannawelcome: "Alanna Welcome",
  alexalana: "Alexa Lana",
  alexis: "Alexis",
  allyfree: "Ally Free",
  allypaid: "Ally Paid",
  aprilb: "April B",
  ashley: "Ashley",
  asiadollpaidfree: "Asia Doll Paid / Free",
  brifreeoftv: "Bri Free / OFTV",
  bripaid: "Bri Paid",
  briwelcome: "Bri Welcome",
  brittanyamain: "Brittanya Main",
  brittanyapaidfree: "Brittanya Paid / Free",
  bronwinfree: "Bronwin Free",
  bronwinoftvmcarteroftv: "Bronwin OFTV & MCarter OFTV",
  bronwinpaid: "Bronwin Paid",
  bronwinwelcome: "Bronwin Welcome",
  camifree: "Cami Free",
  camipaid: "Cami Paid",
  carterpaidfree: "Carter Paid / Free",
  christipaidfree: "Christi Paid and Free",
  claire: "Claire",
  dandfreeoftv: "Dan D Free / OFTV",
  dandpaid: "Dan D Paid",
  essiepaidfree: "Essie Paid / Free",
  fanslyteam1: "Fansly Team1",
  fanslyteam2: "Fansly Team2",
  fanslyteam3: "Fansly Team3",
  francescapaid: "Francesca Paid",
  hazeyfree: "Hazey Free",
  hazeypaid: "Hazey Paid",
  hazeywelcome: "Hazey Welcome",
  honeyvip: "Honey VIP",
  kissingcousinsxvalerievip: "Kissing Cousins X Valerie VIP",
  lilahfree: "Lilah Free",
  lilahpaid: "Lilah Paid",
  livv: "Livv",
  mommycarter: "Mommy Carter",
  natalialfree: "Natalia L Free",
  natalialpaid: "Natalia L Paid",
  natalierfree: "Natalie R Free",
  natalierpaid: "Natalie R Paid",
  sarahc: "Sarah C",
  skypaidfree: "Sky Paid / Free",
  // ...continue your list (copy all from your bot)
};

export function normalizeTag(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[\s_\/&]/g, "")
    .replace(/x/g, "");
}

// This is your EXPECTED_PAGES equivalent (normalized keys)
export const EXPECTED_PAGES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_PAGES).map(([k, v]) => [normalizeTag(k), v])
);
