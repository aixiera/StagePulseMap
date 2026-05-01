# Long Prompt for Codex: Build StagePulse Map

You are Codex working inside my web app project. Build a polished hackathon-ready web app called **StagePulse Map**.

## Context

I am joining Hacker Rivals at Cloud Summit. The challenge is to build a fun, community-focused app or interactive experience that could realistically be part of a future Cloud Summit event. The app must have a working demo, user interface, cloud hosting, and meaningful use of Elastic.co as search, security, or observability.

My idea is **StagePulse Map**: a no-login, live audience interaction app for a speaker presenting at Science World. During a talk, audience members scan a QR code and use the app to vote in a live poll, click locations on the Science World map, add new booths, and submit questions or “pulses” tied to physical locations. The speaker sees the most popular vote, indexed questions, duplicated questions, blocked words, and suspicious burst metrics. Elastic is the search/safety/observability layer.

## Primary UX Goal

Make the app extremely easy for an audience to use during a 5-minute presentation. No signup. No login. No profile creation. The user should be able to open the page and interact within 5 seconds.

## Pages / Views

Build one main responsive page first. It should work on desktop for stage demo and mobile for audience.

### Main UI Layout

1. Top header
   - Brand: “StagePulse Map”
   - Small LIVE pill
   - Subtitle: “No-login audience interaction for Cloud Summit”
   - Live poll module
   - Most Popular Vote card

2. Live Poll
   - Keep the live poll.
   - Do NOT use the old poll options: Demo, Architecture, Security, Chaos.
   - Use location/community options instead:
     - Main Stage
     - Sponsor Booths
     - Hacker Room
     - Food Area
   - Show each option as a large pill button with a percentage.
   - Clicking a poll option increases its vote count.
   - Show “Most Popular Vote” in a separate card.

3. Map Area
   - Use the Science World map image as the background.
   - Add a segmented level switcher:
     - Level 1
     - Level 2
     - OMNIMAX
   - Clicking each level should zoom/position the background map differently.
   - Existing clickable colored points should appear on the map:
     - Peter Brown Family Centre Stage / Main Stage
     - Connection Zone / Sponsor Booths
     - Bits and Bytes Lab / Hacker Room
     - Feature Exhibition
     - Snack Lab / Food Area
     - OMNIMAX Theatre
   - When a point is clicked, it becomes selected and a small floating bubble shows the latest pulse/question from that zone.

4. Add Booth Feature
   - This is required.
   - Add a clearly visible “Add Booth” button.
   - When the user clicks “Add Booth,” enter add-booth mode.
   - In add-booth mode, the user clicks anywhere on the map.
   - A temporary marker appears at that position.
   - The bottom input area changes into a “Name the new booth” form.
   - After entering a booth name and clicking “Create Booth,” a new colored point appears permanently on the map.
   - The new booth should be stored in React state for the demo.
   - Use different colors for new booths.
   - The newly created booth should be selectable and should accept questions/pulses like default booths.

5. Bottom Composer
   - Shows selected booth/zone.
   - Has a text area: “Ask a question or leave a pulse here...”
   - Category chips:
     - Question
     - Praise
     - Need Help
     - Long Line
     - Fun
   - Button: “Send Pulse”
   - When submitted, add the pulse to the selected booth.
   - If a banned word appears, block it and show a toast.
   - Banned words can be a small demo array: spam, stupid, idiot, hate, kill.
   - Do not show blocked content publicly.

6. Right Insight Panel
   - AI Stage Assistant card
   - Keep it as a conceptual AI agent summary:
     - “Audience is focused on live interaction and Elastic safety.”
     - “Suggested next answer: explain how repeated questions are grouped, indexed, searched, and moderated without requiring login.”
   - Metric cards:
     - Indexed Questions
     - Duplicated Questions
     - Blocked Words
     - Suspicious Burst
   - Search Results / Live Feed
     - Use the search input in the map toolbar to filter previous questions/pulses/zones.
   - Elastic Live Layer explanation:
     - Search: questions, booths, zones, categories
     - Security: banned words, spam bursts, bot-like behavior
     - Observability: errors, latency, traffic spikes

## Elastic Integration Story

For the hackathon demo, frontend mock state is okay first, but structure the code so it can later connect to Elastic.

Add comments or abstraction points for:

- `indexQuestionToElastic(question)`
- `searchQuestionsFromElastic(query)`
- `logSecurityEventToElastic(event)`
- `detectSuspiciousBurst(userId, timestamp)`
- `sendObservabilityMetric(metric)`

In the final app, Elastic should be used for:

1. Search
   - Index all questions, pulses, categories, booths, map zones.
   - Search previous questions by keyword.
   - Search previous venue pulses by booth name/category.

2. Security
   - Log banned word attempts.
   - Log repeated submissions from the same anonymous browser ID.
   - Detect bursts such as 10 questions within 20 seconds.
   - Flag bot-like behavior.

3. Observability
   - Track page load, API latency, errors, question submission rate, poll vote rate.
   - Show demo-friendly metrics on the UI.

## AI Agent Behavior

Keep the AI agent focused. Do not build a general chatbot.

The AI Stage Assistant should:
- Summarize what the audience is asking.
- Detect repeated questions using simple text normalization or keyword grouping for MVP.
- Rank top questions by repeated count and recency.
- Recommend what the speaker should answer next.
- Show safety alerts when a banned word or suspicious burst happens.

For MVP, local logic is acceptable:
- Normalize text.
- Group similar questions by keywords:
  - elastic
  - login / anonymous
  - spam / bot / abuse
  - duplicate / repeat
- Show duplicated question count.

## Design Direction

Make it feel like a live event control panel:
- Dark futuristic dashboard
- Glassmorphism cards
- Neon cyan, purple, green, amber accents
- Rounded panels
- Big map area
- Large touch-friendly buttons
- Animated glowing map pins
- Clear hierarchy
- Fast to understand from 10 feet away on a projector

The map should feel like a live “pulse map,” not a static floor map.

## Technical Requirements

Prefer React with either Vite or Next.js. If the project already uses Next.js, adapt the components into the App Router. If starting from scratch, Vite React is fine for fastest hackathon demo.

Use:
- React state for MVP data
- CSS modules, Tailwind, or plain CSS
- lucide-react icons if available
- No login
- No backend required for first UI prototype
- Optional later backend routes for Elastic

## Data Model

Use simple objects:

```js
booth = {
  id: string,
  name: string,
  shortName: string,
  level: "level1" | "level2" | "level5",
  x: number, // percentage from left
  y: number, // percentage from top
  color: "cyan" | "purple" | "amber" | "green",
  pulses: [
    {
      id: string,
      type: "Question" | "Praise" | "Need Help" | "Long Line" | "Fun",
      text: string,
      createdAt?: string,
      browserId?: string
    }
  ]
}
```

Poll:

```js
pollVotes = {
  "Main Stage": 19,
  "Sponsor Booths": 11,
  "Hacker Room": 15,
  "Food Area": 8
}
```

Metrics:

```js
metrics = {
  indexedQuestions: number,
  duplicateQuestions: number,
  blockedWords: number,
  suspiciousBurst: number
}
```

## Important Changes From Previous Mockup

- Remove old poll/rating options: Demo, Architecture, Security, Chaos.
- Keep the live poll, but make it location/community based.
- Keep “Most Popular Vote.”
- Keep “Indexed Questions.”
- Keep “Duplicated Questions.”
- Keep “Blocked Words.”
- Keep “Suspicious Burst.”
- Add a real “Add Booth” feature where a colored point appears after the user clicks the map and names the booth.
- Keep no-login flow.
- Keep Science World map background.
- Keep question/search/moderation idea.

## Files in this starter

- `src/App.jsx` contains the main UI and prototype logic.
- `src/styles.css` contains all UI styling.
- `public/scienceworldmap.png` is the Science World map background.

## Use Skills If Needed

Use any relevant Codex skills if they are available in the environment:
- UI design skill for improving layout, responsiveness, and visual hierarchy.
- React skill for component cleanup.
- Accessibility skill for buttons, labels, contrast, and keyboard navigation.
- Security skill for input sanitization, rate limiting, and abuse prevention.
- Elastic or observability skill for designing the integration layer.
- Deployment skill for Vercel/Netlify/Cloudflare hosting.

Do not overbuild. The deadline is short. Prioritize a beautiful working demo over a complete production system.

## Acceptance Criteria

The app is done when:

1. The page loads without login.
2. The live poll works and updates percentages.
3. The most popular vote card updates.
4. The map background appears.
5. The level switcher changes map focus.
6. Existing booths/points are clickable.
7. Add Booth mode works:
   - click Add Booth
   - click map
   - enter booth name
   - create booth
   - colored point appears
8. User can submit a pulse/question to a selected booth.
9. Banned word submissions are blocked.
10. Search filters previous pulses/questions.
11. Dashboard shows:
   - Indexed Questions
   - Duplicated Questions
   - Blocked Words
   - Suspicious Burst
12. UI looks polished enough to present on stage.
13. The architecture can be explained as: React frontend + anonymous browser IDs + Elastic for search/security/observability + optional AI agent for duplicate grouping and speaker summary.
