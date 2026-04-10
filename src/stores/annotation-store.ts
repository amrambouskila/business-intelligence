import { create } from 'zustand';

export interface Annotation {
  id: string;
  dataPointIndex: number;
  text: string;
  createdAt: Date;
}

interface AnnotationState {
  annotations: Annotation[];
  addAnnotation: (a: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
}

let annCounter = 0;

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],

  addAnnotation: (a) =>
    set((s) => ({
      annotations: [
        ...s.annotations,
        { ...a, id: `ann-${++annCounter}`, createdAt: new Date() },
      ],
    })),

  removeAnnotation: (id) =>
    set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),

  clearAnnotations: () => set({ annotations: [] }),
}));
