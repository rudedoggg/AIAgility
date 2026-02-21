import { Bucket, Deliverable, Message, Section } from "@/lib/types";

type ProjectId = string;

type ProjectTemplate = {
  dashboardStatus: {
    status: string;
    done: string[];
    undone: string[];
    nextSteps: string[];
  };
  executiveSummary: string;
  goals: {
    navTitle: string;
    summary: {
      status: string;
      done: string[];
      undone: string[];
      nextSteps: string[];
    };
    sections: Section[];
  };
  lab: {
    navTitle: string;
    summary: {
      status: string;
      done: string[];
      undone: string[];
      nextSteps: string[];
    };
    buckets: Bucket[];
  };
  deliverables: {
    navTitle: string;
    summary: {
      status: string;
      done: string[];
      undone: string[];
      nextSteps: string[];
    };
    deliverables: Deliverable[];
  };
};

const baseMessages: Message[] = [
  {
    id: "1",
    role: "ai",
    content: "I’m ready. What’s the decision or outcome you’re driving toward?",
    timestamp: "10:00 AM",
  },
  {
    id: "2",
    role: "user",
    content: "Help me structure this project so we can move faster with fewer blind spots.",
    timestamp: "10:01 AM",
  },
  {
    id: "3",
    role: "ai",
    content:
      "Got it. I’ll help define goals, collect research, and produce deliverables. When I suggest content, you can save it to a specific bucket.",
    timestamp: "10:02 AM",
    hasSaveableContent: true,
  },
];

function executiveSummaryFor(projectName: string) {
  return `# Executive Summary — ${projectName}

## Standing Question
Give me a two-page executive summary of this project.

## Summary (Draft)
This project is currently in early structuring. The goal is to clarify scope, establish decision criteria, collect the right evidence, and produce decision-ready deliverables. The workspace is organized into Brief (what “good” looks like), Discovery (evidence and knowledge buckets), and Deliverables (outputs for stakeholders).

Over the next iterations, the main focus is to tighten the feedback loop between new evidence and updated deliverables. The system supports two layers of conversation: a global thread that can reference the entire page, and bucket-scoped threads that are constrained to the bucket’s attachments and local history.

## Near-Term Next Steps
1. Confirm objective and non-negotiable constraints.
2. Populate research buckets with the minimum viable evidence.
3. Produce a first-pass deliverable draft and iterate.
`;
}

export function getProjectTemplates() {
  const templates: Record<ProjectId, ProjectTemplate> = {
    "p-1": {
      dashboardStatus: {
        status: "Decision timeline is active. Define criteria, gather options, then converge.",
        done: ["Drafted decision framing"],
        undone: ["Confirm budget cap", "Collect commute data"],
        nextSteps: ["Lock evaluation criteria", "Gather 3 location options"],
      },
      executiveSummary: executiveSummaryFor("Office Location Decision"),
      goals: {
        navTitle: "Project Brief",
        summary: {
          status: "Brief is partially defined. The objective is clear; constraints need numbers.",
          done: ["Context defined", "Objective drafted"],
          undone: ["Stakeholder list incomplete", "Financial constraints undefined"],
          nextSteps: ["Confirm budget", "Confirm stakeholder list"],
        },
        sections: [
          {
            id: "context",
            genericName: "Context",
            subtitle: "Where are we? Why now?",
            completeness: 75,
            totalItems: 4,
            completedItems: 3,
            content:
              "Current lease expires in ~6 months. Headcount has grown. Hybrid policy is stabilizing and the office footprint must match.",
            items: [
              { id: "p1-g-1", type: "note", title: "Lease timeline", preview: "", date: "Feb 7" },
              { id: "p1-g-2", type: "link", title: "Broker intro", preview: "", date: "Feb 8", url: "https://example.com" },
            ],
            isOpen: true,
          },
          {
            id: "objective",
            genericName: "Objective",
            subtitle: "What are we trying to accomplish?",
            completeness: 40,
            totalItems: 5,
            completedItems: 2,
            content:
              "Select a location that supports recruiting and hybrid work, fits budget constraints, and minimizes team disruption.",
            items: [],
            isOpen: false,
          },
          {
            id: "stakeholders",
            genericName: "Stakeholders",
            subtitle: "Who must agree / who is impacted?",
            completeness: 20,
            totalItems: 5,
            completedItems: 1,
            content: "Board, exec team, department leads, employees, finance.",
            items: [],
            isOpen: false,
          },
          {
            id: "constraints",
            genericName: "Constraints",
            subtitle: "Budget, location, timeline",
            completeness: 10,
            totalItems: 4,
            completedItems: 0,
            content: "Budget cap TBD. Move date driven by lease. ADA + transit accessibility required.",
            items: [],
            isOpen: false,
          },
        ],
      },
      lab: {
        navTitle: "Knowledge Buckets",
        summary: {
          status: "Research phase active. Market context exists; team preferences need data.",
          done: ["Pulled market overview"],
          undone: ["Collect employee commute inputs"],
          nextSteps: ["Add 3 candidate locations", "Summarize commute impacts"],
        },
        buckets: [
          {
            id: "research",
            name: "Market Research",
            isOpen: true,
            items: [
              { id: "p1-l-1", type: "doc", title: "CRE market snapshot", preview: "", date: "Feb 8" },
              { id: "p1-l-2", type: "link", title: "Comparable listings", preview: "", date: "Feb 9", url: "https://example.com" },
            ],
          },
          {
            id: "interviews",
            name: "Stakeholder Interviews",
            isOpen: false,
            items: [{ id: "p1-l-3", type: "note", title: "CEO preferences", preview: "", date: "Feb 7" }],
          },
        ],
      },
      deliverables: {
        navTitle: "Deliverables",
        summary: {
          status: "Drafting phase. Recommendation memo structure exists; analysis needs evidence.",
          done: ["Memo outline created"],
          undone: ["Fill commute analysis", "Risk section"],
          nextSteps: ["Draft exec summary", "Attach comps"],
        },
        deliverables: [
          {
            id: "1",
            title: "Board Recommendation Memo",
            status: "draft",
            lastEdited: "Just now",
            engaged: true,
            completeness: 55,
            subtitle: "Board-ready memo + appendix",
            items: [
              { id: "p1-d-1", type: "note", title: "Open questions", preview: "", date: "Feb 10" },
              { id: "p1-d-2", type: "link", title: "Comp set spreadsheet", preview: "", date: "Feb 11", url: "https://example.com" },
            ],
            content: "# Board Recommendation\n\n## Executive Summary\n(TBD)\n\n## Options\n1. ...\n2. ...\n\n## Risks\n(TBD)\n",
          },
          {
            id: "2",
            title: "Employee Commute Analysis",
            status: "review",
            lastEdited: "2 hours ago",
            engaged: false,
            completeness: 35,
            subtitle: "Commute model + charts",
            items: [{ id: "p1-d-3", type: "file", title: "Commute dataset.csv", preview: "", date: "Feb 9", fileName: "Commute dataset.csv", fileSizeLabel: "842 KB" }],
            content: "Loading analysis...",
          },
        ],
      },
    },

    "p-2": {
      dashboardStatus: {
        status: "Analysis project. Build a defensible model and communicate tradeoffs clearly.",
        done: ["Identified data sources"],
        undone: ["Normalize locations", "Produce charts"],
        nextSteps: ["Run baseline model", "Document assumptions"],
      },
      executiveSummary: executiveSummaryFor("Commute Impact Study"),
      goals: {
        navTitle: "Project Brief",
        summary: {
          status: "Objective is defined as a model. Constraints are mostly technical/data-related.",
          done: ["Drafted research question"],
          undone: ["Confirm data completeness", "Agree on fairness metrics"],
          nextSteps: ["Define assumptions", "Draft methodology"],
        },
        sections: [
          {
            id: "context",
            genericName: "Context",
            subtitle: "Why measure commute impact?",
            completeness: 60,
            totalItems: 5,
            completedItems: 3,
            content:
              "We need an evidence-based view of commute impacts across candidate locations to avoid unintended attrition and inequity.",
            items: [{ id: "p2-g-1", type: "note", title: "Research question", preview: "", date: "Feb 9" }],
            isOpen: true,
          },
          {
            id: "objective",
            genericName: "Objective",
            subtitle: "What output will we ship?",
            completeness: 35,
            totalItems: 4,
            completedItems: 1,
            content: "A model + charts summarizing commute deltas by team and region.",
            items: [],
            isOpen: false,
          },
          {
            id: "stakeholders",
            genericName: "Stakeholders",
            subtitle: "Who uses the analysis?",
            completeness: 20,
            totalItems: 4,
            completedItems: 1,
            content: "People ops, execs, team leads.",
            items: [],
            isOpen: false,
          },
          {
            id: "constraints",
            genericName: "Constraints",
            subtitle: "Data quality, privacy, timing",
            completeness: 15,
            totalItems: 4,
            completedItems: 1,
            content: "No raw addresses in outputs. Must be reproducible. Timebox to 1 week.",
            items: [],
            isOpen: false,
          },
        ],
      },
      lab: {
        navTitle: "Knowledge Buckets",
        summary: {
          status: "Evidence collection in progress. Data sources exist; joins/cleaning pending.",
          done: ["Located HRIS export"],
          undone: ["Geocoding approach", "Transit time estimates"],
          nextSteps: ["Define pipeline", "Upload sample dataset"],
        },
        buckets: [
          {
            id: "research",
            name: "Data Sources",
            isOpen: true,
            items: [
              { id: "p2-l-1", type: "file", title: "employees_hub.csv", preview: "", date: "Feb 9", fileName: "employees_hub.csv", fileSizeLabel: "312 KB" },
              { id: "p2-l-2", type: "link", title: "Transit API docs", preview: "", date: "Feb 9", url: "https://example.com" },
            ],
          },
          {
            id: "interviews",
            name: "Assumptions + Methodology",
            isOpen: false,
            items: [{ id: "p2-l-3", type: "note", title: "Assumption log", preview: "", date: "Feb 10" }],
          },
        ],
      },
      deliverables: {
        navTitle: "Deliverables",
        summary: {
          status: "Deliverables are in pre-draft. Waiting on baseline model outputs.",
          done: ["Outlined slide structure"],
          undone: ["Generate charts", "Write assumptions"],
          nextSteps: ["Create first visuals", "Draft narrative"],
        },
        deliverables: [
          {
            id: "1",
            title: "Commute Impact Deck",
            status: "draft",
            lastEdited: "Today",
            engaged: true,
            completeness: 25,
            subtitle: "Charts + narrative",
            items: [{ id: "p2-d-1", type: "note", title: "Slide outline", preview: "", date: "Feb 10" }],
            content: "# Commute Impact Deck\n\n## What we measured\n(TBD)\n\n## Key findings\n(TBD)\n",
          },
          {
            id: "2",
            title: "Assumptions Appendix",
            status: "review",
            lastEdited: "Today",
            engaged: false,
            completeness: 15,
            subtitle: "Methodology + caveats",
            items: [],
            content: "Loading...",
          },
        ],
      },
    },

    "p-3": {
      dashboardStatus: {
        status: "Writing project. Convert inputs into a board-ready narrative and artifacts.",
        done: ["Collected initial inputs"],
        undone: ["Align on narrative", "Finalize appendix"],
        nextSteps: ["Draft v1", "Run review"],
      },
      executiveSummary: executiveSummaryFor("Board Memo Draft"),
      goals: {
        navTitle: "Project Brief",
        summary: {
          status: "Goal is a strong narrative: decision, rationale, risks, and next steps.",
          done: ["Drafted memo outline"],
          undone: ["Risk framing", "Sensitivity table"],
          nextSteps: ["Draft executive summary", "Compile appendix"],
        },
        sections: [
          {
            id: "context",
            genericName: "Context",
            subtitle: "What the board needs to know",
            completeness: 55,
            totalItems: 6,
            completedItems: 3,
            content: "We need a crisp narrative that’s decision-ready and defensible.",
            items: [{ id: "p3-g-1", type: "note", title: "Board expectations", preview: "", date: "Feb 10" }],
            isOpen: true,
          },
          {
            id: "objective",
            genericName: "Objective",
            subtitle: "What will the memo accomplish?",
            completeness: 45,
            totalItems: 4,
            completedItems: 2,
            content: "A board-ready recommendation memo with appendix.",
            items: [],
            isOpen: false,
          },
          {
            id: "stakeholders",
            genericName: "Stakeholders",
            subtitle: "Authors, reviewers, decision makers",
            completeness: 25,
            totalItems: 5,
            completedItems: 1,
            content: "Exec sponsor, finance, people ops, board chair.",
            items: [],
            isOpen: false,
          },
          {
            id: "constraints",
            genericName: "Constraints",
            subtitle: "Tone, brevity, evidence",
            completeness: 10,
            totalItems: 4,
            completedItems: 0,
            content: "Two pages max + appendix. Must include risks and assumptions.",
            items: [],
            isOpen: false,
          },
        ],
      },
      lab: {
        navTitle: "Knowledge Buckets",
        summary: {
          status: "Inputs exist, but need consolidation into a clean appendix.",
          done: ["Collected edits"],
          undone: ["Finalize comps", "Add risk notes"],
          nextSteps: ["Clean appendix", "Summarize key evidence"],
        },
        buckets: [
          {
            id: "research",
            name: "Evidence + Appendix",
            isOpen: true,
            items: [
              { id: "p3-l-1", type: "link", title: "Comp set", preview: "", date: "Feb 11", url: "https://example.com" },
              { id: "p3-l-2", type: "note", title: "Edits to incorporate", preview: "", date: "Feb 10" },
            ],
          },
          {
            id: "interviews",
            name: "Reviewer Feedback",
            isOpen: false,
            items: [{ id: "p3-l-3", type: "chat", title: "AI rewrite options", preview: "", date: "Feb 12" }],
          },
        ],
      },
      deliverables: {
        navTitle: "Deliverables",
        summary: {
          status: "Memo is drafting. Needs executive summary + risks + appendix references.",
          done: ["Outline ready"],
          undone: ["Write v1", "Review cycle"],
          nextSteps: ["Draft v1", "Send for review"],
        },
        deliverables: [
          {
            id: "1",
            title: "Board Memo v1",
            status: "draft",
            lastEdited: "Just now",
            engaged: true,
            completeness: 30,
            subtitle: "Two pages + appendix",
            items: [{ id: "p3-d-1", type: "note", title: "Narrative beats", preview: "", date: "Feb 12" }],
            content: "# Board Memo\n\n## Executive Summary\n(TBD)\n\n## Recommendation\n(TBD)\n\n## Risks\n(TBD)\n",
          },
          {
            id: "2",
            title: "Appendix Binder",
            status: "review",
            lastEdited: "Today",
            engaged: false,
            completeness: 20,
            subtitle: "Evidence references",
            items: [],
            content: "Loading...",
          },
        ],
      },
    },
  };

  return { templates, baseMessages };
}
