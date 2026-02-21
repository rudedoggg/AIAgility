// Types for the application state

export type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  hasSaveableContent?: boolean; // For the [Paperclip] push mechanic
  saved?: boolean;
};

export type Section = {
  id: string;
  genericName: string;
  subtitle: string;
  completeness: number; // 0-100
  totalItems: number;
  completedItems: number;
  content?: string;
  items?: BucketItem[];
  isOpen?: boolean;
};

export type BucketItem = {
  id: string;
  type: 'doc' | 'link' | 'chat' | 'note' | 'file';
  title: string;
  preview: string;
  date: string;
  url?: string;
  fileName?: string;
  fileSizeLabel?: string;
};

export type Category = {
  id: string;
  name: string;
  items: BucketItem[];
  isOpen?: boolean;
};

export type Deliverable = {
  id: string;
  title: string;
  subtitle?: string;
  completeness?: number; // 0-100
  status: 'draft' | 'review' | 'final';
  lastEdited: string;
  content: string;
  items?: BucketItem[];
  engaged: boolean; // Whether AI engages with this
};
