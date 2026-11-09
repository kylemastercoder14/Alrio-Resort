export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  category: string;
  items: FaqItem[];
};

export type AddOn = {
  key: string;
  name: string;
  description: string;
  price: number;
  priceNote: string;
  icon: string; // lucide icon name or emoji for now
  badge?: string;
};
