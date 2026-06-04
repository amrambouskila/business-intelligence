import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '@/stores/annotation-store';

describe('useAnnotationStore', () => {
  beforeEach(() => {
    useAnnotationStore.setState({ annotations: [] });
  });

  it('adds an annotation with generated id and createdAt', () => {
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds1', dataPointIndex: 5, text: 'note' });
    const a = useAnnotationStore.getState().annotations;
    expect(a).toHaveLength(1);
    expect(a[0].id).toMatch(/^ann-/);
    expect(a[0].datasetId).toBe('ds1');
    expect(a[0].createdAt).toBeInstanceOf(Date);
  });

  it('removes an annotation by id', () => {
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds1', dataPointIndex: 1, text: 'x' });
    const id = useAnnotationStore.getState().annotations[0].id;
    useAnnotationStore.getState().removeAnnotation(id);
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('ignores remove requests for unknown ids', () => {
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds1', dataPointIndex: 1, text: 'x' });
    useAnnotationStore.getState().removeAnnotation('missing');
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it('clears all annotations', () => {
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds1', dataPointIndex: 1, text: 'a' });
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds2', dataPointIndex: 2, text: 'b' });
    useAnnotationStore.getState().clearAnnotations();
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('clears annotations for one dataset', () => {
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds1', dataPointIndex: 1, text: 'a' });
    useAnnotationStore.getState().addAnnotation({ datasetId: 'ds2', dataPointIndex: 2, text: 'b' });
    useAnnotationStore.getState().clearAnnotations('ds1');
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    expect(useAnnotationStore.getState().annotations[0].datasetId).toBe('ds2');
  });
});
