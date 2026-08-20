# বাকি কাজ

শেষ আপডেট: ২০ আগস্ট ২০২৬ · কমিট `7193da7` · ব্রাঞ্চ `main`, পরিষ্কার

নতুন সেশনে এই ফাইলটা পড়লেই বোঝা যাবে কোথায় থেমেছিল।
নিয়মকানুন আর স্থাপত্য `CLAUDE.md`-তে।

---

## 🔴 আটকে আছে — মানুষের উপর নির্ভরশীল

### ১. iOS বিল্ড — Apple-এর অনুমতি

App Store-এ দেওয়ার সব কোড তৈরি, কিন্তু বিল্ড হচ্ছে না।

**অবস্থা:**
- ✅ Bundle ID `com.rebintech.app` নিবন্ধিত (Istiaque করে দিয়েছেন)
- ❌ Distribution Certificate — `403 forbidden`

**কারণ:** ডেভেলপারের role **Developer**, কিন্তু certificate বানাতে **Admin** লাগে।
Apple-এর নথিতে স্পষ্ট: *"Only the Account Holder or Admin role can create
distribution certificates."*

**কে করবে:** Istiaque Mahmud (`imr.rafat@gmail.com`), Account Holder
```
appstoreconnect.apple.com/access/users
→ mozahidul.islam.ai@gmail.com → Role: Admin → Save
```

⚠️ কোড দিয়ে এর সমাধান নেই। ঘুরপথ খোঁজার চেষ্টা করবেন না — যাচাই করা হয়েছে,
Apple ইচ্ছাকৃতভাবে এটা আটকায়।

**Admin হয়ে গেলে:**
```bash
cd apps/mobile
npx eas build --platform ios --profile production
```
Apple ID, পাসওয়ার্ড, 2FA কোড চাইবে। Certificate আর Profile — দুটোতেই `y`।
২০ মিনিট।

### ২. EU trader status

App Store Connect-এ ঘোষণা করা হয়নি। ইউরোপে অ্যাপ রাখতে হলে লাগবে।
এটাও Account Holder-এর কাজ।

---

## 🟡 করা যায় এখনই

### ৩. নতুন Android APK

ফোনে যে APK আছে সেটা কমিট `b33360c`-এর, কিন্তু তারপর `e6353b4` এসেছে।
**তাই legal লিংকের সংশোধনটা ফোনে নেই।**

```bash
cd apps/mobile
npx eas build --platform android --profile preview
```
১৫–২৫ মিনিট। শেষে ইনস্টল লিংক দেবে।

⚠️ Apple রিভিউয়ের আগে এটা যাচাই করা জরুরি — লগইন ও সাইন আপ পর্দায়
Privacy/Terms লিংক দুটো সত্যিই ব্রাউজারে খোলে কি না।

### ৪. টেস্ট ডেটা পরিষ্কার

ড্যাশবোর্ডের "Booked against collected" চার্ট ভুল দেখাচ্ছে — ৮৫৭ / ১১,৩২২ (৭.৬%)।
কারণ পরীক্ষার সময় বানানো `555555` নামের একটা ১০,০০০ ইউনিটের সারি।

```
Supabase → SQL Editor → supabase/snippets/clear_test_data.sql চালান
```
মুছবে: `Collect`, `555555`, `probe2/3/4@rebin.test`
থাকবে: ১২টা ডেমো vendor আর তাদের সব ডেটা

### ৫. Groq চাবি বদলানো

`GROQ_API_KEY` একবার খোলা চ্যাটে এসেছিল। রিপোতে নেই, শুধু Supabase-এর
secret-এ আছে — তবু বদলে নেওয়া উচিত।

```
console.groq.com/keys → পুরনোটা Delete → নতুন Create
npx supabase secrets set GROQ_API_KEY=<নতুন চাবি>
```
⚠️ চাবি বদলালে ফাংশন আবার deploy করতে হবে না।

---

## 🔵 ক্লায়েন্টের সিদ্ধান্ত লাগবে

### ৬. ক্যাটালগের ওজন ও ধাতুর হিসাব যাচাই

`0035_catalog_v3.sql`-এর ওজন আর `0040_material_content.sql`-এর ধাতুর
পরিমাণ — দুটোই **গবেষণা থেকে নেওয়া অনুমান**, কেউ কিছু মাপেনি।

দাম সরাসরি ওজনের উপর নির্ভর করে, তাই ভুল হলে প্রতি সংগ্রহে টাকার হিসাব
এদিক-ওদিক হবে।

ক্লায়েন্টকে দিয়ে যাচাই করানো দরকার। বদলাতে হলে Prices পাতা থেকেই হবে।

### ৭. Gemini-তে বিলিং

ফ্রি স্তরে Google মাঝেমধ্যে `503` দেয় (পয়সা দেওয়া গ্রাহকদের আগে বসায়)।
Groq ফলব্যাক আছে, কিন্তু Groq-এর নিজের সীমা মিনিটে ৮,০০০ টোকেন।

বিলিং চালু করলে সমস্যা প্রায় মিটে যায় — ১০,০০০ ছবিতে ≈ $২।
কোড বদলাতে হবে না।

```
aistudio.google.com/apikey → Set up billing
```

---

## ✅ শেষ হয়েছে

সাম্প্রতিক কাজগুলো, যাতে আবার না করা হয়:

| কমিট | কী |
|---|---|
| `e6353b4` | লগইন ও সাইন আপে legal লিংক ঠিক করা |
| `b33360c` | ছবিতে ধাতুর হিসাব দেখানো |
| `72c5c6d` | ড্যাশবোর্ডে একটাই মিলিত ধারা |
| `8a971bd` | কার্যকলাপের ধারা + পাতাভাগ |
| `cd7729e` | Gemini ব্যর্থ হলে Groq |
| `205186c` | Organization-এ হাতে লেখার পথ |
| `423741c` | নেটওয়ার্ক কাটলে আর লগআউট নয় |

সব লাইভে — edge functions deploy করা, migration চালানো, Render নিজে থেকে
আপডেট হয়েছে।

---

## দ্রুত রেফারেন্স

**লাইভ:** https://rebin-tech.onrender.com
**রিপো:** https://github.com/Mozahid-AIUB/Rebin-Tech
**Supabase:** প্রকল্প `tyblthpsuwobdurfhsvq`

**ডেমো অ্যাকাউন্ট** — পাসওয়ার্ড সবার `Rebin@Demo2026`
```
eastgate.computer.repair@rebin.demo       Business
rakib.collection@rebin.demo               Supplier
cedar.ridge.medical.center@rebin.demo     Organization
```

**অপারেটর:** `mozahidul.islam.ai@gmail.com`

**লোকাল চালানো:**
```bash
pnpm --filter web dev        # :4300
pnpm --filter mobile start   # Expo
```

**যাচাই:**
```bash
pnpm --filter web typecheck
pnpm --filter mobile typecheck && pnpm --filter mobile test   # ১৪২ পাস
pnpm --filter @rebin/shared test                              # ৯৪ পাস
```
