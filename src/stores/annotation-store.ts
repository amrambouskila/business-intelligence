import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Annotation {
  id: string;
  datasetId: string;
  dataPointIndex: number;
  text: string;
  createdAt: Date;
}

interface AnnotationState {
  annotations: Annotation[];
  addAnnotation: (a: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: (datasetId?: string) => void;
}

let annCounter = 0;

export const useAnnotationStore = create<AnnotationState>()(
  immer((set) => ({
  annotations: [],

  addAnnotation: (a) =>
    set((s) => {
      s.annotations.push({ ...a, id: `ann-${++annCounter}`, createdAt: new Date() });
    }),

  removeAnnotation: (id) =>
    set((s) => {
      const index = s.annotations.findIndex((a) => a.id === id);
      if (index >= 0) {
        s.annotations.splice(index, 1);
      }
    }),

  clearAnnotations: (datasetId) =>
    set((s) => {
      if (datasetId == null) {
        s.annotations = [];
      } else {
        s.annotations = s.annotations.filter((annotation) => annotation.datasetId !== datasetId);
      }
    }),
})),
);
