# News Rating & Audit System Architecture

This document visualizes the three distinct ranking and auditing systems working in tandem to surface high-quality news.

## System Interaction Flowchart

```mermaid
flowchart TD
    %% --- External Sources ---
    RSS[RSS Feeds] -->|Raw XML| Fetcher[RSS Aggregator]
    Fetcher -->|Parse| Normalize[Normalize Item]

    %% --- SYSTEM 1: SECTION HEALTH (Reliability) ---
    subgraph "System 1: Section Health Monitor (Reliability)"
        Normalize --> Count{Count Items}
        Count -->|Record| History[LocalStorage History]
        History -->|Avg(3)| CalcHealth[Calculate Ratio]
        CalcHealth -->|Ratio < 0.5| Warn[⚠️ Warning]
        CalcHealth -->|Ratio < 0.1| Crit[🔴 Critical]
        CalcHealth -->|Ratio >= 0.5| OK[🟢 OK]
        Warn --> UI_Header[Section Header Badge]
        Crit --> UI_Header
    end

    %% --- SYSTEM 2: CORE RANKING ENGINE (Relevance) ---
    subgraph "System 2: Core Ranking Engine (Relevance)"
        Normalize --> Filter[Filter]
        Filter -->|Freshness + Keywords| CheckMode{Ranking Mode?}

        %% Path A: Legacy (Fast Path)
        CheckMode -->|Legacy| SkipScore[Skip Scoring]
        SkipScore -->|Score = 0| Cluster

        %% Path B: Smart/Context (Scoring Path)
        CheckMode -->|Smart/Context| BaseScore[Base Score]
        BaseScore -->|Source Credibility| Stars[⭐ Credibility]
        BaseScore -->|Impact Keywords| Impact[Impact Score]
        BaseScore -->|Sentiment| Senti[Sentiment Analysis]
        BaseScore -->|Visuals| Vis[Visual Score]

        Stars & Impact & Senti & Vis --> TotalScore[Final ImpactScore]
        TotalScore --> Cluster[Deduplicate & Cluster]

        %% Clustering (Unified)
        Cluster -->|Similiarity > 0.75| Group[Group Articles]
        Group -->|Count Unique Sources| SourceCount[Source Count]
        SourceCount -->|Apply Boost| BoostedScore[Boosted ImpactScore]

        %% Final Sort
        BoostedScore --> SortDecide{Sort Mode?}
        SortDecide -->|Legacy| SortDate[Sort by Date]
        SortDecide -->|Smart/Context| SortScore[Sort by Score]
    end

    %% --- Data State Update ---
    SortDate & SortScore --> Context[NewsContext State]
    Context --> UI_List[Render News List]

    %% --- SYSTEM 3: AUDIT & BADGING (Verification) ---
    subgraph "System 3: Audit & Badging System (Verification)"
        Context -->|Wait 3s (Idle Time)| Audit[Run Full Audit]

        %% 1. Consensus
        Audit -->|Check SourceCount > 1| Lightning{Consensus?}
        Lightning -->|Yes| BadgeBolt[⚡ Consensus Badge]

        %% 2. Persistence
        Audit -->|Check Previous Top 10| Persist{Persisted?}
        Persist -->|Yes| BadgeCloud[🌩️ Persistence Badge]

        %% 3. Relevance
        Audit -->|Check User Keywords| Relevance{User Match?}
        Relevance -->|Keyword + Source| BadgeTarget[🎯 Target Badge]
        Relevance -->|Keyword Only| BadgePin[📌 Pin Badge]

        %% 4. Anomalies
        Audit -->|Age > 2x Median| Old{Stale?}
        Old -->|Yes| BadgeClock[🕰️ Stale Badge]

        Audit -->|Score Deviation| Outlier{Sigma > 2?}
        Outlier -->|High| BadgeUp[📊↑ Outlier Badge]
    end

    %% --- Visual Updates ---
    BadgeBolt & BadgeCloud & BadgeTarget & BadgePin & BadgeClock & BadgeUp --> UI_Badges[Update Article Badges]
    UI_Badges -.-> UI_List
```

## Logic Breakdown

### System 1: Section Health (Synchronous)
*   **Trigger**: Immediately after fetching a section.
*   **Logic**: `Ratio = CurrentCount / Avg(Last 3 Fetches)`
*   **Output**: `newsData.health` object attached to the array.
*   **Purpose**: Ensures the *reliability* of the feed itself.

### System 2: Core Ranking Engine (Synchronous)
*   **Trigger**: During `fetchSectionNews`.
*   **Optimization**: In `Legacy` mode, expensive scoring (`computeImpactScore`) is skipped entirely for performance.
*   **Modes**:
    *   **Legacy**: Purely chronological (newest first). Score = 0.
    *   **Smart Mix (Default)**: Uses 9-factor scoring (Freshness, Source Tier, Keywords, Sentiment, Visuals, etc.) to calculate `ImpactScore`.
    *   **Context-Aware**: Uses Smart Mix scoring but *interleaves* high-proximity (local) stories at fixed intervals.
*   **Output**: Sorted array.
*   **Purpose**: Determines the *order* and *relevance* of stories.

### System 3: Audit & Badging System (Asynchronous)
*   **Trigger**: 3 seconds after `NewsContext` updates (Idle Time).
*   **Logic**:
    *   **Consensus (⚡)**: Checks `item.sourceCount` (calculated in System 2).
    *   **Persistence (🌩️)**: Compares ID against `localStorage` history of previous fetch.
    *   **Relevance (🎯)**: Regex match against user settings.
    *   **Anomalies (🕰️/📊)**: Statistical analysis of age and score distribution.
*   **Output**: `auditResults` state in Context, which re-renders specific badges.
*   **Purpose**: Provides *verification* and *context* without altering the sort order determined by System 2.
