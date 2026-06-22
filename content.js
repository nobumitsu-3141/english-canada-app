/* ===== 学習コンテンツ（ロールプレイ・紹介状課題・週スケジュール・採点ルーブリック） ===== */
window.CONTENT = {

// 共通 採点ルーブリック（ロールプレイの最後に貼る）
rubric:
`Now switch to ASSESSOR mode and score my performance:
- Overall CEFR estimate (A1–C2) and OET-equivalent grade (A–E) for Speaking.
- Sub-scores (0–5): Intelligibility/Pronunciation, Fluency, Grammar, Vocabulary range,
  Clinical communication (empathy, plain language, structure).
- The 3 highest-impact things to fix next.
- Rewrite my 2 weakest utterances as a fluent Canadian anesthesiologist would phrase them.
Be specific and honest — do not be encouraging for its own sake.`,

// 臨床ロールプレイ（音声モード推奨。終わったら "END" → ルーブリックを貼って採点）
roleplays: [
  { id:1, title:"術前面談 (Pre-op assessment)", prompt:
`You are a 65-year-old patient named David, scheduled for a laparoscopic cholecystectomy tomorrow.
You have COPD (on inhalers), poorly controlled hypertension, and you smoke 15 cigarettes a day.
You are a bit anxious and tend to give short answers unless I ask open questions.
I am the anesthesiologist doing your pre-operative assessment.
Rules: Stay fully in character. Do NOT coach me during the conversation.
Use natural Canadian patient register (informal, some hesitation).
When I say "END", stop and switch to assessor mode and score me (see rubric below).
Begin by greeting me and waiting for my first question.` },
  { id:2, title:"麻酔の同意取得 (Informed consent)", prompt:
`Role-play: I am the anesthesiologist; you are a 40-year-old patient about to have a general anaesthetic
for a knee arthroscopy. You are educated and will ask pointed questions about risks
("How likely is it that I won't wake up?", "Will I be in pain?", "Can I have a spinal instead?").
Push me to explain risks in plain language and to check my understanding.
Stay in character until I say "END", then score me on clarity, empathy, risk communication, and shared decision-making.` },
  { id:3, title:"合併症の説明 (Breaking bad news — SPIKES)", prompt:
`Role-play a difficult conversation. You are the adult son of a patient who had an unexpected intra-operative
awareness event. You are worried and slightly angry. I am the anesthesiologist explaining what happened.
Make me earn the conversation: react emotionally, interrupt once, ask "Why did this happen?"
Stay in character until "END". Then assess my use of the SPIKES framework, my empathy, and whether
I avoided jargon. Give me 3 specific better phrasings I could have used.` },
  { id:4, title:"急変コール (Leading a resuscitation)", prompt:
`Simulate an intra-operative cardiac arrest. You are my anaesthetic assistant + nurse (play both).
Feed me realistic updates ("BP is unrecordable", "rhythm is VF", "two minutes elapsed").
I will give orders out loud. Enforce CLOSED-LOOP: only "carry out" an order after I name a person,
a drug, a dose and a route — if I'm vague, reply "Sorry, who and how much?".
Keep the scenario moving in real time for ~4 minutes, then say "END" and score my crisis communication:
role allocation, closed-loop, clarity, and calm pacing.` },
  { id:5, title:"申し送り / SBAR (Handover)", prompt:
`I am going to hand over a patient to you (you are the on-call ICU physician) using SBAR.
After I finish, do two things:
1) Tell me back what you understood (to test if my handover was clear).
2) Score my handover on structure (S-B-A-R), concision, and whether the "Recommendation" was specific.
Patient I'll hand over: a 62-year-old, post-CABG, now hypotensive. I'll start now.` },
  { id:6, title:"症例プレゼン / カンファ英語", prompt:
`You are an attending at a Toronto anesthesia rounds. I will present a case for ~2 minutes.
Listen, then ask me 3 follow-up questions an attending would actually ask, and score my presentation
on structure, signposting, pace, and academic register. Then have me re-present incorporating your feedback.
Case: make one up for me (anesthesia-relevant).` },
  { id:7, title:"術後回診 / PACU (Post-op round)", prompt:
`Role-play: You are a patient in the recovery room (PACU) one hour after a laparoscopic appendicectomy under GA.
You have moderate pain (6/10), mild nausea, and you are a little groggy. I am the anesthesiologist doing a post-op round.
Answer naturally; mention pain and nausea only if I ask the right questions.
Stay in character until "END", then score me on post-op assessment structure, empathy,
plain-language explanation of pain/PONV management, and safety-netting.` },
  { id:8, title:"無痛分娩の説明 (Labour epidural counselling)", prompt:
`Role-play: You are a 30-year-old woman in early labour, 3 cm dilated, requesting an epidural.
You are in pain and anxious, worried about a needle in your back and about not being able to push.
I am the anesthesiologist counselling and consenting you. Ask realistic questions
("Will it stop me pushing?", "Could it paralyse me?", "How long does it take?").
Stay in character until "END", then score clarity, risk communication, empathy, and consent quality.` },
  { id:9, title:"雑談 / チーム対人 (Small talk)", prompt:
`You are a Canadian OR nurse I work with daily. Run 5 minutes of realistic between-cases small talk
(weather, hockey, the weekend, a tricky case). Keep me talking, then score how natural my small talk was
and give me 5 idiomatic phrases Canadians actually use that I missed.` }
],

// 発音・流暢性（録音の文字起こしを貼って使う）
pron:
`I will paste a transcript of my own speaking (from a recording).
1) Flag every spot where a Japanese-L1 listener-error is likely (θ/s, l/r, v/b, final consonants, vowel length, -teen/-ty).
2) Mark filler words and false starts; estimate my filler rate (%).
3) Give me 5 minimal-pair drills targeting MY specific errors.
4) Rewrite one paragraph the way a fluent Canadian physician would say it, then I'll shadow it.
Transcript: [ここに録音の文字起こしを貼る]`,

// 音読用パッセージ（150語・wpm測定）
wpmPassage:
`Good morning, my name is Dr Tanaka and I am one of the anaesthetists. I will be looking after you during your operation today. Before we go ahead, I would like to ask you a few questions and explain what to expect, and then you can ask me anything that is on your mind. First, can you tell me in your own words which operation you are having? Have you ever had an anaesthetic before, and did anything go wrong with it, such as feeling sick afterwards or being difficult to wake up? Do you have any loose teeth, caps, or crowns? Have you had anything to eat or drink since midnight? I am asking because an empty stomach makes the anaesthetic much safer for you. Once we are in the operating room, I will place a small drip in the back of your hand, attach some monitors, and give you the medicine to send you off to sleep gently.`,

// OET Writing 採点プロンプト（紹介状を書いたら貼る）
letterGrader:
`Act as a strict OET Writing examiner (Medicine, sub-test for doctors).
Here is my referral letter [paste below]. Assess it against the OET criteria:
Purpose, Content, Conciseness & Clarity, Genre & Style, Organisation & Layout, Language.
Give a band estimate (A–E) per criterion, mark every grammar/collocation error inline,
and rewrite the 3 weakest sentences. Finish with a 5-bullet checklist I should self-check next time.

MY LETTER:
`,

// 紹介状の課題（架空・オリジナル。日替わりでローテーション）
letters: [
  { title:"術前評価 → 内科（HTN＋新規AF）", task:"内科 Dr Sara Lin への紹介状（180–200語）。待機手術前の評価と最適化を依頼。", notes:
`Patient:   Mr Kenji Tanaka, 68, male. Retired teacher. Independent ADLs, limited by knee pain.
Planned:   Elective right total knee replacement, in ~3 weeks.
PMH:       Hypertension (12y). Type 2 diabetes (8y). Osteoarthritis both knees.
Social:    Ex-smoker (quit 10y ago, 30 pack-years). Minimal alcohol.
Meds:      Amlodipine 5 mg daily. Metformin 1 g BD. Paracetamol PRN.
Today:     BP 172/98 (repeat 168/96). Pulse irregular ~96. ECG: NEW atrial fibrillation, rate 96,
           no acute ischaemia. HbA1c 8.4%. BMI 31. Mild exertional dyspnoea on stairs. No chest pain/syncope.
Plan:      Defer surgery for optimisation — poorly controlled HTN; new AF (needs rate control,
           anticoagulation decision, cause work-up); suboptimal glycaemic control.` },
  { title:"術前評価 → 睡眠クリニック（未治療OSA）", task:"睡眠呼吸クリニックへの紹介状（180–200語）。減量手術前のOSA評価/治療を依頼。", notes:
`Patient:   Ms Aiko Mori, 47, female. Office manager.
Planned:   Elective laparoscopic sleeve gastrectomy, in ~6 weeks.
PMH:       Obesity (BMI 42). Type 2 diabetes. GORD. Hypertension.
Symptoms:  Loud snoring, witnessed apnoeas (per partner), morning headaches, daytime sleepiness
           (Epworth 14/24), unrefreshing sleep.
Exam:      Neck circumference 44 cm. Mallampati III. Crowded oropharynx.
Concern:   Likely untreated obstructive sleep apnoea → peri-operative airway/respiratory risk.
Plan:      Request sleep study and, if confirmed, CPAP optimisation BEFORE surgery.` },
  { title:"困難気道の申し送り → 麻酔前評価", task:"麻酔前評価クリニックへの紹介状（180–200語）。前回の挿管困難歴を引き継ぎ、計画立案を依頼。", notes:
`Patient:   Mr Tomoya Sato, 58, male.
Planned:   Elective shoulder arthroplasty, in ~4 weeks.
Event:     Previous GA (2 years ago) — DIFFICULT INTUBATION documented: Cormack-Lehane 3,
           two failed direct laryngoscopy attempts, eventually secured with videolaryngoscope.
           Minor dental damage. No surgical airway needed.
PMH:       Rheumatoid arthritis (reduced neck extension, possible atlanto-axial involvement). GORD.
Exam:      Mouth opening 3 cm. Thyromental distance reduced. Mallampati III.
Plan:      Flag difficult airway. Request anaesthetic pre-assessment for airway plan
           (awake videolaryngoscopy vs other), cervical spine review, and clear documentation/alert.` },
  { title:"術前評価 → 循環器（収縮期雑音・AS疑い）", task:"循環器への紹介状（180–200語）。待機手術前に心エコーと評価を依頼。", notes:
`Patient:   Mrs Hanako Ito, 74, female.
Planned:   Elective hip hemiarthroplasty (after a fall), in ~2 weeks (semi-urgent).
PMH:       Hypertension. Osteoporosis. CKD stage 3.
Finding:   Ejection systolic murmur, right upper sternal border, radiating to the carotids.
           Reduced exercise tolerance; one episode of exertional pre-syncope.
Exam:      BP 138/86. Slow-rising pulse. Chest clear. No peripheral oedema.
Concern:   Possible significant aortic stenosis → raised peri-operative risk.
Plan:      Request urgent echocardiography and cardiology assessment to grade the valve
           and advise on anaesthetic risk and optimisation before surgery.` },
  { title:"退院サマリー → かかりつけ医 (Discharge to GP)", task:"GP宛の退院サマリー（180–200語）。術後経過と今後の管理を引き継ぎ。", notes:
`Patient:   Mr Daichi Saito, 60, male.
Procedure: Elective laparoscopic cholecystectomy under GA, 2 days ago. Uneventful.
Anaes:     GA with LMA. Multimodal analgesia. No PONV. No airway problems.
Course:    Mobilised day 0; tolerating diet; pain controlled on oral analgesia; wounds clean and dry.
Meds:      Discharge on paracetamol + a short NSAID course; resume metformin and amlodipine.
Follow-up: Remove dressings day 7; surgical review in 4 weeks.
Action:    GP to recheck blood pressure (was 150/92 pre-operatively) and review diabetic control.
Task:      Write a brief discharge letter to the GP summarising the admission and the actions needed.` }
]
};
