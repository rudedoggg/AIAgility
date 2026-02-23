import { Message, Section, Category, Deliverable } from './types';

export const mockMessages: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: "I'm ready to help you structure this decision. What are you trying to get done?",
    timestamp: '10:00 AM',
  },
  {
    id: '2',
    role: 'user',
    content: "We need to decide on the new office location by next month.",
    timestamp: '10:01 AM',
  },
  {
    id: '3',
    role: 'ai',
    content: "Okay, that's a significant operational decision. To help you with the office location search, I've outlined a few key areas we should cover: Financial Constraints, Employee Commute Impact, and Brand Alignment. Does this structure look right to you?",
    timestamp: '10:01 AM',
    hasSaveableContent: true,
  }
];

export const mockSections: Section[] = [
  {
    id: 'context',
    genericName: 'Context',
    subtitle: 'Where are we? Why now?',
    completeness: 80,
    totalItems: 5,
    completedItems: 4,
    content: "Current lease expires in 6 months. Team has grown by 40% since last year. We are shifting to a hybrid model.",
    items: [
      { id: 'g-1', type: 'note', title: 'Kickoff notes', preview: 'Lease renewal options, renewal penalties, and break clauses...', date: 'Feb 7' },
      { id: 'g-2', type: 'link', title: 'Lease summary doc', preview: 'https://example.com/lease-summary', date: 'Feb 8', url: 'https://example.com/lease-summary' },
    ],
    isOpen: true
  },
  {
    id: 'objective',
    genericName: 'Objective',
    subtitle: 'What are we trying to accomplish?',
    completeness: 40,
    totalItems: 3,
    completedItems: 1,
    items: [
      { id: 'g-3', type: 'file', title: 'Objective draft v2.pdf', preview: '128 KB', date: 'Feb 9', fileName: 'Objective draft v2.pdf', fileSizeLabel: '128 KB' },
    ],
    isOpen: false
  },
  {
    id: 'stakeholders',
    genericName: 'Stakeholders',
    subtitle: 'Board, Staff, Donors',
    completeness: 20,
    totalItems: 5,
    completedItems: 1,
    isOpen: false
  },
  {
    id: 'constraints',
    genericName: 'Constraints',
    subtitle: 'Budget, Location, Timeline',
    completeness: 0,
    totalItems: 3,
    completedItems: 0,
    isOpen: false
  }
];

export const mockCategories: Category[] = [
  {
    id: 'research',
    name: 'Market Research',
    isOpen: true,
    items: [
      { id: '1', type: 'doc', title: 'Commercial Real Estate Report Q4', preview: 'Market trends indicate a drop in...', date: 'Feb 8' },
      { id: '2', type: 'link', title: 'Competitor Locations Map', preview: 'Map view of...', date: 'Feb 9' },
    ]
  },
  {
    id: 'interviews',
    name: 'Stakeholder Interviews',
    isOpen: false,
    items: [
      { id: '3', type: 'note', title: 'Notes from CEO meeting', preview: 'Prioritize natural light...', date: 'Feb 7' },
      { id: '4', type: 'chat', title: 'AI Chat: Employee Survey', preview: 'Summary of survey results...', date: 'Feb 6' },
    ]
  }
];

export const mockDeliverables: Deliverable[] = [
  {
    id: '1',
    title: 'Board Recommendation Memo',
    status: 'draft',
    lastEdited: 'Just now',
    engaged: true,
    completeness: 65,
    subtitle: 'Board-ready memo + appendix',
    items: [
      { id: 'd-1', type: 'note', title: 'Edits to incorporate', preview: 'Tone down certainty; add risk section; add sensitivity table...', date: 'Feb 10' },
      { id: 'd-2', type: 'link', title: 'Comp set spreadsheet', preview: 'https://example.com/comp-set', date: 'Feb 11', url: 'https://example.com/comp-set' },
    ],
    content: `# Board Recommendation: New Office Location

## Executive Summary
We recommend proceeding with the downtown location due to its superior accessibility and alignment with our brand image, despite the slightly higher cost per square foot.

## Options Considered
1. Downtown High-Rise
2. Suburban Campus
3. Distributed Hub Model

## Analysis
...`
  },
  {
    id: '2',
    title: 'Employee Commute Analysis',
    status: 'review',
    completeness: 35,
    subtitle: 'Commute model + charts',
    lastEdited: '2 hours ago',
    engaged: false,
    items: [
      { id: 'd-3', type: 'file', title: 'Commute dataset.csv', preview: '842 KB', date: 'Feb 9', fileName: 'Commute dataset.csv', fileSizeLabel: '842 KB' },
    ],
    content: 'Loading analysis...'
  }
];
