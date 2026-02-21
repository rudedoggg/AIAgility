import { storage } from "./storage";

function executiveSummaryFor(name: string) {
  return `# Executive Summary — ${name}

## Standing Question
Give me a two-page executive summary of this project.

## Summary (Draft)
This project is currently in early structuring. The goal is to clarify scope, establish decision criteria, collect the right evidence, and produce decision-ready deliverables. The workspace is organized into Brief (what “good” looks like), Discovery (evidence and knowledge buckets), and Deliverables (outputs for stakeholders).

Over the next iterations, the main focus is to tighten the feedback loop between new evidence and updated deliverables.

## Near-Term Next Steps
1. Confirm objective and non-negotiable constraints.
2. Populate research buckets with the minimum viable evidence.
3. Produce a first-pass deliverable draft and iterate.
`;
}

export async function seedDemoData(userId?: string) {
  const p1 = await storage.createProject({
    name: "Office Location Decision",
    summary: "",
    userId: userId || null,
    executiveSummary: executiveSummaryFor("Office Location Decision"),
    dashboardStatus: {
      status: "Decision timeline is active. Define criteria, gather options, then converge.",
      done: ["Drafted decision framing"],
      undone: ["Confirm budget cap", "Collect commute data"],
      nextSteps: ["Lock evaluation criteria", "Gather 3 location options"],
    },
  });

  const p1Goals = [
    { genericName: "Context", subtitle: "Where are we? Why now?", completeness: 75, totalItems: 4, completedItems: 3, content: "Current lease expires in ~6 months. Headcount has grown. Hybrid policy is stabilizing and the office footprint must match.", sortOrder: 0 },
    { genericName: "Objective", subtitle: "What are we trying to accomplish?", completeness: 40, totalItems: 5, completedItems: 2, content: "Select a location that supports recruiting and hybrid work, fits budget constraints, and minimizes team disruption.", sortOrder: 1 },
    { genericName: "Stakeholders", subtitle: "Who must agree / who is impacted?", completeness: 20, totalItems: 5, completedItems: 1, content: "Board, exec team, department leads, employees, finance.", sortOrder: 2 },
    { genericName: "Constraints", subtitle: "Budget, location, timeline", completeness: 10, totalItems: 4, completedItems: 0, content: "Budget cap TBD. Move date driven by lease. ADA + transit accessibility required.", sortOrder: 3 },
  ];
  const createdP1Goals = [];
  for (const g of p1Goals) {
    createdP1Goals.push(await storage.createGoalSection({ ...g, projectId: p1.id }));
  }

  await storage.createBucketItem({ parentId: createdP1Goals[0].id, parentType: "goal", type: "note", title: "Lease timeline", preview: "Current lease expiration details", date: "Feb 7", sortOrder: 0 });
  await storage.createBucketItem({ parentId: createdP1Goals[0].id, parentType: "goal", type: "link", title: "Broker intro", preview: "https://example.com", date: "Feb 8", url: "https://example.com", sortOrder: 1 });

  const p1Labs = [
    { name: "Market Research", sortOrder: 0 },
    { name: "Stakeholder Interviews", sortOrder: 1 },
  ];
  const createdP1Labs = [];
  for (const l of p1Labs) {
    createdP1Labs.push(await storage.createLabBucket({ ...l, projectId: p1.id }));
  }

  await storage.createBucketItem({ parentId: createdP1Labs[0].id, parentType: "lab", type: "doc", title: "CRE market snapshot", preview: "Market trends overview", date: "Feb 8", sortOrder: 0 });
  await storage.createBucketItem({ parentId: createdP1Labs[0].id, parentType: "lab", type: "link", title: "Comparable listings", preview: "https://example.com", date: "Feb 9", url: "https://example.com", sortOrder: 1 });
  await storage.createBucketItem({ parentId: createdP1Labs[1].id, parentType: "lab", type: "note", title: "CEO preferences", preview: "Natural light, transit access", date: "Feb 7", sortOrder: 0 });

  const p1Deliverables = [
    { title: "Board Recommendation Memo", subtitle: "Board-ready memo + appendix", completeness: 55, status: "draft", content: "# Board Recommendation\n\n## Executive Summary\n(TBD)\n\n## Options\n1. ...\n2. ...\n\n## Risks\n(TBD)\n", engaged: true, sortOrder: 0 },
    { title: "Employee Commute Analysis", subtitle: "Commute model + charts", completeness: 35, status: "review", content: "Loading analysis...", engaged: false, sortOrder: 1 },
  ];
  const createdP1Deliverables = [];
  for (const d of p1Deliverables) {
    createdP1Deliverables.push(await storage.createDeliverable({ ...d, projectId: p1.id }));
  }

  await storage.createBucketItem({ parentId: createdP1Deliverables[0].id, parentType: "deliverable", type: "note", title: "Open questions", preview: "Budget, timeline, risks", date: "Feb 10", sortOrder: 0 });
  await storage.createBucketItem({ parentId: createdP1Deliverables[0].id, parentType: "deliverable", type: "link", title: "Comp set spreadsheet", preview: "https://example.com", date: "Feb 11", url: "https://example.com", sortOrder: 1 });
  await storage.createBucketItem({ parentId: createdP1Deliverables[1].id, parentType: "deliverable", type: "file", title: "Commute dataset.csv", preview: "842 KB", date: "Feb 9", fileName: "Commute dataset.csv", fileSizeLabel: "842 KB", sortOrder: 0 });

  const p2 = await storage.createProject({
    name: "Commute Impact Study",
    summary: "",
    userId: userId || null,
    executiveSummary: executiveSummaryFor("Commute Impact Study"),
    dashboardStatus: {
      status: "Analysis project. Build a defensible model and communicate tradeoffs clearly.",
      done: ["Identified data sources"],
      undone: ["Normalize locations", "Produce charts"],
      nextSteps: ["Run baseline model", "Document assumptions"],
    },
  });

  const p2Goals = [
    { genericName: "Context", subtitle: "Why measure commute impact?", completeness: 60, totalItems: 5, completedItems: 3, content: "We need an evidence-based view of commute impacts across candidate locations to avoid unintended attrition and inequity.", sortOrder: 0 },
    { genericName: "Objective", subtitle: "What output will we ship?", completeness: 35, totalItems: 4, completedItems: 1, content: "A model + charts summarizing commute deltas by team and region.", sortOrder: 1 },
    { genericName: "Stakeholders", subtitle: "Who uses the analysis?", completeness: 20, totalItems: 4, completedItems: 1, content: "People ops, execs, team leads.", sortOrder: 2 },
    { genericName: "Constraints", subtitle: "Data quality, privacy, timing", completeness: 15, totalItems: 4, completedItems: 1, content: "No raw addresses in outputs. Must be reproducible. Timebox to 1 week.", sortOrder: 3 },
  ];
  for (const g of p2Goals) {
    const created = await storage.createGoalSection({ ...g, projectId: p2.id });
    if (g.genericName === "Context") {
      await storage.createBucketItem({ parentId: created.id, parentType: "goal", type: "note", title: "Research question", preview: "How do commute changes affect retention?", date: "Feb 9", sortOrder: 0 });
    }
  }

  const p2Lab1 = await storage.createLabBucket({ name: "Data Sources", sortOrder: 0, projectId: p2.id });
  const p2Lab2 = await storage.createLabBucket({ name: "Assumptions + Methodology", sortOrder: 1, projectId: p2.id });
  await storage.createBucketItem({ parentId: p2Lab1.id, parentType: "lab", type: "file", title: "employees_hub.csv", preview: "312 KB", date: "Feb 9", fileName: "employees_hub.csv", fileSizeLabel: "312 KB", sortOrder: 0 });
  await storage.createBucketItem({ parentId: p2Lab1.id, parentType: "lab", type: "link", title: "Transit API docs", preview: "https://example.com", date: "Feb 9", url: "https://example.com", sortOrder: 1 });
  await storage.createBucketItem({ parentId: p2Lab2.id, parentType: "lab", type: "note", title: "Assumption log", preview: "Key assumptions documented", date: "Feb 10", sortOrder: 0 });

  const p2D1 = await storage.createDeliverable({ title: "Commute Impact Deck", subtitle: "Charts + narrative", completeness: 25, status: "draft", content: "# Commute Impact Deck\n\n## What we measured\n(TBD)\n\n## Key findings\n(TBD)\n", engaged: true, sortOrder: 0, projectId: p2.id });
  await storage.createDeliverable({ title: "Assumptions Appendix", subtitle: "Methodology + caveats", completeness: 15, status: "review", content: "Loading...", engaged: false, sortOrder: 1, projectId: p2.id });
  await storage.createBucketItem({ parentId: p2D1.id, parentType: "deliverable", type: "note", title: "Slide outline", preview: "Structure for the deck", date: "Feb 10", sortOrder: 0 });

  const p3 = await storage.createProject({
    name: "Board Memo Draft",
    summary: "",
    userId: userId || null,
    executiveSummary: executiveSummaryFor("Board Memo Draft"),
    dashboardStatus: {
      status: "Writing project. Convert inputs into a board-ready narrative and artifacts.",
      done: ["Collected initial inputs"],
      undone: ["Align on narrative", "Finalize appendix"],
      nextSteps: ["Draft v1", "Run review"],
    },
  });

  const p3Goals = [
    { genericName: "Context", subtitle: "What the board needs to know", completeness: 55, totalItems: 6, completedItems: 3, content: "We need a crisp narrative that's decision-ready and defensible.", sortOrder: 0 },
    { genericName: "Objective", subtitle: "What will the memo accomplish?", completeness: 45, totalItems: 4, completedItems: 2, content: "A board-ready recommendation memo with appendix.", sortOrder: 1 },
    { genericName: "Stakeholders", subtitle: "Authors, reviewers, decision makers", completeness: 25, totalItems: 5, completedItems: 1, content: "Exec sponsor, finance, people ops, board chair.", sortOrder: 2 },
    { genericName: "Constraints", subtitle: "Tone, brevity, evidence", completeness: 10, totalItems: 4, completedItems: 0, content: "Two pages max + appendix. Must include risks and assumptions.", sortOrder: 3 },
  ];
  for (const g of p3Goals) {
    const created = await storage.createGoalSection({ ...g, projectId: p3.id });
    if (g.genericName === "Context") {
      await storage.createBucketItem({ parentId: created.id, parentType: "goal", type: "note", title: "Board expectations", preview: "Clarity, brevity, defensibility", date: "Feb 10", sortOrder: 0 });
    }
  }

  const p3Lab1 = await storage.createLabBucket({ name: "Evidence + Appendix", sortOrder: 0, projectId: p3.id });
  const p3Lab2 = await storage.createLabBucket({ name: "Reviewer Feedback", sortOrder: 1, projectId: p3.id });
  await storage.createBucketItem({ parentId: p3Lab1.id, parentType: "lab", type: "link", title: "Comp set", preview: "https://example.com", date: "Feb 11", url: "https://example.com", sortOrder: 0 });
  await storage.createBucketItem({ parentId: p3Lab1.id, parentType: "lab", type: "note", title: "Edits to incorporate", preview: "Reviewer feedback notes", date: "Feb 10", sortOrder: 1 });
  await storage.createBucketItem({ parentId: p3Lab2.id, parentType: "lab", type: "chat", title: "AI rewrite options", preview: "Alternative phrasings", date: "Feb 12", sortOrder: 0 });

  const p3D1 = await storage.createDeliverable({ title: "Board Memo v1", subtitle: "Two pages + appendix", completeness: 30, status: "draft", content: "# Board Memo\n\n## Executive Summary\n(TBD)\n\n## Recommendation\n(TBD)\n\n## Risks\n(TBD)\n", engaged: true, sortOrder: 0, projectId: p3.id });
  await storage.createDeliverable({ title: "Appendix Binder", subtitle: "Evidence references", completeness: 20, status: "review", content: "Loading...", engaged: false, sortOrder: 1, projectId: p3.id });
  await storage.createBucketItem({ parentId: p3D1.id, parentType: "deliverable", type: "note", title: "Narrative beats", preview: "Key story points", date: "Feb 12", sortOrder: 0 });

  const baseMessages = [
    { role: "ai", content: "I'm ready. What's the decision or outcome you're driving toward?", timestamp: "10:00 AM", hasSaveableContent: false, saved: false, sortOrder: 0 },
    { role: "user", content: "Help me structure this project so we can move faster with fewer blind spots.", timestamp: "10:01 AM", hasSaveableContent: false, saved: false, sortOrder: 1 },
    { role: "ai", content: "Got it. I'll help define the brief, collect research, and produce deliverables. When I suggest content, you can save it to a specific bucket.", timestamp: "10:02 AM", hasSaveableContent: true, saved: false, sortOrder: 2 },
  ];

  for (const pid of [p1.id, p2.id, p3.id]) {
    for (const pageType of ["goal_page", "lab_page", "deliverable_page"]) {
      for (const msg of baseMessages) {
        await storage.createChatMessage({ ...msg, parentId: pid, parentType: pageType });
      }
    }
  }
}
