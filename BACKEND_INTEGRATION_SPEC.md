# 🔌 IEI Student Chapter — Backend Integration Specification

This specification defines the complete data contract, API endpoints, variable naming conventions, schema definitions, and frontend adaptation requirements for connecting a dynamic backend to the **IEI Student Chapter** web application.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Data Contracts & Schemas](#2-data-contracts--schemas)
   - [Next Event Schema (`NextEvent`)](#21-next-event-schema-nextevent)
   - [Past Event & Timeline Schema (`TimelineEvent`)](#22-past-event--timeline-schema-timelineevent)
   - [Gallery & Photo Album Schema (`GalleryEvent`)](#23-gallery--photo-album-schema-galleryevent)
   - [Team & Faculty Schema (`TeamMember`)](#24-team--faculty-schema-teammember)
3. [REST API Endpoints](#3-rest-api-endpoints)
4. [Frontend Adaptive Scaling (1 Event to 100+ Events)](#4-frontend-adaptive-scaling)
5. [Image Storage & CDN Standards](#5-image-storage--cdn-standards)
6. [Ready-to-Use AI Prompt for Building the Backend](#6-ready-to-use-ai-prompt-for-building-the-backend)

---

## 1. Architecture Overview

The frontend is a high-performance, single-page application built with modern vanilla HTML5, CSS3, WebGL, and JavaScript. 

The website has **three dynamic event modules**:
1. **Next Event Spotlight (`#nextEventCard`)**: Highlights the single upcoming workshop/hackathon with date, category tag, title, description, and status.
2. **Horizontal Timeline Rail (`#evTrack`)**: An interactive, alternating timeline showing past events chronologically with date badges and category tags.
3. **Event Gallery & Modal Lightbox (`#clMosaic` & `#lightbox`)**: An Apple-grade photo mosaic where clicking an event card opens an edge-to-edge multi-photo carousel album with swipe gestures and keyboard navigation.

```
┌─────────────────────────────────────────────────────────────┐
│                    IEI BACKEND API                          │
│   (Node.js / Express, Python / FastAPI, Supabase, etc.)     │
└───────────────┬─────────────────────────────┬───────────────┘
                │ GET /api/events/next        │ GET /api/events/past
                ▼                             ▼
   ┌──────────────────────────┐  ┌──────────────────────────┐
   │    Next Event Banner     │  │  Timeline & Photo Album  │
   │    (#nextEventCard)      │  │  (#evTrack & #clMosaic)  │
   └──────────────────────────┘  └──────────────────────────┘
```

---

## 2. Data Contracts & Schemas

All field names must strictly follow **`camelCase`**. Dates must use ISO 8601 strings (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`) or formatted display tokens.

### 2.1. Next Event Schema (`NextEvent`)

```typescript
interface NextEvent {
  id: string;                    // Unique identifier, e.g. "ev-2026-03-ethical-hacking"
  status: "announced" | "tba";   // "announced" if date is fixed, "tba" if pending details
  tag: string;                   // Category tag, e.g. "WORKSHOP", "CTF DRILL", "HACKATHON"
  tagBadge: string;              // Sub-badge text, e.g. "UPCOMING · LIVE LAB" or "UPCOMING · DETAILS SOON"
  title: string;                 // Main headline, e.g. "ADVANCED ETHICAL HACKING WORKSHOP"
  description: string;           // 1-3 sentences summary of the event
  dateIso: string | null;        // ISO 8601 string "2026-03-20T10:00:00Z" (or null if TBA)
  displayDate: {
    day: string;                 // "20" (or "DATE" if TBA)
    month: string;               // "MAR" (or "TBA" if TBA)
    year: string;                // "2026" (or "" if TBA)
    timeText: string;            // "10:00 AM IST" (or "TIME TBA")
  };
  location: string;              // "Club Lab — GHRCEM Campus, Wagholi, Pune"
  registrationUrl: string | null;// External registration link or null
  isRegistrationOpen: boolean;   // true enables primary CTA button, false shows "Details Soon"
}
```

#### Example Payload:
```json
{
  "id": "ev-2026-03-web-sec",
  "status": "announced",
  "tag": "WORKSHOP",
  "tagBadge": "UPCOMING · HANDS-ON",
  "title": "WEB APPLICATION EXPLOITATION & DEFENSE",
  "description": "A comprehensive deep dive into OWASP Top 10 vulnerabilities, API security testing, and building secure authentication pipelines.",
  "dateIso": "2026-03-25T11:30:00+05:30",
  "displayDate": {
    "day": "25",
    "month": "MAR",
    "year": "2026",
    "timeText": "11:30 AM IST"
  },
  "location": "Cybersecurity Lab, GHRCEM Pune",
  "registrationUrl": "https://forms.gle/sample-event-registration",
  "isRegistrationOpen": true
}
```

---

### 2.2. Past Event & Timeline Schema (`TimelineEvent`)

Used to render the horizontal milestone timeline in `#evTrack`.

```typescript
interface TimelineEvent {
  id: string;                    // Matches GalleryEvent id, e.g. "gal-ai-threat-intel"
  slug: string;                  // URL-friendly identifier, e.g. "threat-intel-ai"
  title: string;                 // Event title, e.g. "THREAT INTEL IN THE AGE OF AI"
  category: "competition" | "workshop" | "drill" | "session"; // Timeline filter tag
  categoryLabel: string;         // Display tag, e.g. "SESSION", "DRILL", "CTF"
  date: {
    day: string;                 // Two-digit day: "09"
    month: string;               // Three-letter uppercase month: "NOV"
    year: string;                // Four-digit year: "2025"
  };
  shortDescription: string;      // 1-sentence teaser
  sortOrder: number;             // Chronological sort index (higher = newer)
}
```

---

### 2.3. Gallery & Photo Album Schema (`GalleryEvent`)

Used for the `#clMosaic` photo cards and `#lightbox` full-screen image carousel.

```typescript
interface AlbumImage {
  url: string;                   // CDN/storage URL of the image
  alt: string;                   // Accessible image description
  caption?: string;              // Optional individual slide caption
  width?: number;                // Original pixel width (e.g. 1920)
  height?: number;               // Original pixel height (e.g. 1080)
}

interface GalleryEvent {
  id: string;                    // DOM ID & key in EVENT_ALBUMS (e.g. "gal-ai-threat-intel")
  title: string;                 // Display title: "Threat Intel in the Age of AI"
  category: "competition" | "workshop" | "drill" | "all"; // Category filter mode
  dateFormatted: string;         // Display capsule text: "NOV 2025"
  description: string;           // Detailed description shown inside Lightbox modal
  coverImage: {
    url: string;                 // Primary thumbnail image URL
    alt: string;
  };
  images: AlbumImage[];          // Array of high-resolution images for the Lightbox carousel (1 to 20 images)
  totalPhotos: number;           // Count of images in the album
  tags: string[];                // e.g. ["AI", "Threat Intel", "Cybersecurity"]
}
```

#### Example Payload:
```json
{
  "id": "gal-ai-threat-intel",
  "title": "Threat Intel in the Age of AI",
  "category": "session",
  "dateFormatted": "NOV 2025",
  "description": "A full-day expert workshop exploring automated threat intelligence feeds, generative AI attack surfaces, and defensive triage protocols.",
  "coverImage": {
    "url": "https://your-cdn.com/events/threat-intel/cover.jpg",
    "alt": "Threat Intel Workshop presentation"
  },
  "images": [
    {
      "url": "https://your-cdn.com/events/threat-intel/photo-01.jpg",
      "alt": "Students participating in threat analysis lab"
    },
    {
      "url": "https://your-cdn.com/events/threat-intel/photo-02.jpg",
      "alt": "Keynote speaker explaining AI telemetry"
    },
    {
      "url": "https://your-cdn.com/events/threat-intel/photo-03.jpg",
      "alt": "Group photo of attendees and faculty mentors"
    }
  ],
  "totalPhotos": 3,
  "tags": ["AI", "Threat Intelligence", "Workshop"]
}
```

---

### 2.4. Team & Faculty Schema (`TeamMember`)

Used by `operators.js` for the Solo Card interactive leadership deck.

```typescript
interface TeamSubMember {
  name: string;                  // First Name + Last Name (e.g. "Priyanshu Yadav")
  linkedin: string;              // Direct LinkedIn profile link
}

interface TeamMember {
  id: string;                    // "op-samiksha-kotkar"
  name: string;                  // "Samiksha Kotkar" or "[TBA]"
  title: string;                 // "Technical Lead", "Secretary", "Head of Department (HOD)"
  team?: "TECHNICAL" | "MANAGEMENT" | "PR" | "CREATIVE"; // Required for domain leads
  group: "faculty" | "admin" | "lead"; // Determines board row placement
  linkedin: string;              // LinkedIn URL (or "#" if TBA)
  image: string;                 // Path or URL to photo (e.g. "assets/team/samiksha-kotkar.jpg")
  members?: TeamSubMember[];     // Array of sub-team members (for domain leads)
}
```

---

## 3. REST API Endpoints

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/events/next` | Returns the current upcoming event object | ❌ Public |
| `GET` | `/api/events/past` | Returns array of past timeline events + gallery albums | ❌ Public |
| `GET` | `/api/team` | Returns full executive & domain lead roster | ❌ Public |
| `POST` | `/api/admin/events` | Creates a new event (upcoming or past) | 🔐 Admin |
| `PUT` | `/api/admin/events/:id` | Updates an existing event or marks as completed | 🔐 Admin |
| `DELETE` | `/api/admin/events/:id` | Deletes an event | 🔐 Admin |
| `POST` | `/api/admin/events/:id/photos` | Uploads multiple photos (`multipart/form-data`) | 🔐 Admin |

---

## 4. Frontend Adaptive Scaling

The frontend has been specifically engineered to remain **100% stable across all counts of events**:

### When `Events Count = 1` (Starting / Inaugural State):
- **Timeline Rail (`#evTrack`)**: The single milestone node renders cleanly on the rail. The left and right navigation arrows automatically become disabled (`disabled = true`) without throwing JavaScript bounds errors.
- **Gallery Grid (`#clMosaic`)**: Uses CSS Grid `repeat(auto-fit, minmax(250px, 1fr))`. A single card renders with its designated aspect ratio and does not blow up to full viewport width or stretch unnaturally.
- **Lightbox (`#lightbox`)**: When opened with 1 image, previous/next buttons and keyboard arrows hide or cycle gracefully on the single frame without dividing by zero.

### When `Events Count = 0` (Empty State):
- The frontend renders an inline fallback card:
  ```html
  <div class="empty-events-state">
    <p class="mono text-muted">// NO PREVIOUS EVENTS RECORDED YET</p>
    <p>Check back soon after our inaugural workshop!</p>
  </div>
  ```

### When `Events Count >= 20` (Mature Chapter State):
- The timeline supports **inertia drag-to-scroll**, **trackpad horizontal scroll**, and **arrow stepping**.
- Filter buttons (`ALL`, `COMPETITIONS`, `WORKSHOPS`, `DEFENSE`) instantly categorize cards and recalculate the lightbox sequence dynamically.

---

## 5. Image Storage & CDN Standards

When building the backend image upload pipeline:

1. **Formats**: Accept `.jpg`, `.jpeg`, `.png`, `.webp`. Automatically convert/compress to modern **WebP** or optimized **JPEG** (quality 85–90%).
2. **Resolution Guidelines**:
   - **Event Cover Images**: $1200 \times 750\text{ px}$ (16:10 aspect ratio).
   - **Lightbox Album Photos**: $1600 \times 1000\text{ px}$ (Max file size: 800 KB per photo).
   - **Team Lead Portraits**: $800 \times 800\text{ px}$ (1:1 square, centered face framing).
3. **Storage Providers**:
   - Cloudflare R2, AWS S3, Supabase Storage, or Firebase Cloud Storage.

---

## 6. Ready-to-Use AI Prompt for Building the Backend

Copy and paste the prompt below into an AI agent (or give to a backend developer) whenever you are ready to generate the backend service:

```markdown
### SYSTEM PROMPT: Build IEI Student Chapter Dynamic Events & Gallery Backend

You are building the official REST API backend for the IEI Student Chapter website.
Refer to the specification in BACKEND_INTEGRATION_SPEC.md for exact schemas and variable names.

#### Tech Stack:
- Node.js (Express + TypeScript) OR Python (FastAPI)
- Database: PostgreSQL / SQLite (via Prisma or SQLAlchemy) OR Supabase
- Storage: Cloudflare R2 / AWS S3 / local multipart upload for event photos
- Authentication: Simple JWT / Admin API Key for protected endpoints

#### Required API Routes:
1. `GET /api/events/next` -> Returns active `NextEvent` JSON.
2. `GET /api/events/past` -> Returns array of `TimelineEvent` and `GalleryEvent` with `images[]`.
3. `GET /api/team` -> Returns the full team roster array matching `TeamMember` schema.
4. `POST /api/admin/events` -> Create a new event (protected).
5. `PUT /api/admin/events/:id` -> Update an event (protected).
6. `POST /api/admin/events/:id/photos` -> Upload and optimize photos for an event album (protected).

#### Key Requirements:
- Field names MUST strictly match camelCase variable names in BACKEND_INTEGRATION_SPEC.md.
- Ensure CORS is enabled for the frontend origin.
- Provide automatic image resizing/compression (converting uploads to WebP/JPEG max 1200px).
- Return empty arrays `[]` instead of 500 errors when 0 events exist.
```

---

*Specification created for the IEI Student Chapter (Department of Cyber Security and Data Science, GHRCEM Pune).*
