import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, reducer } from './use-toast';

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test',
        description: 'Test description',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test');
  });

  it('should dismiss toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      const toastId = result.current.toast({
        title: 'Test',
      });
      result.current.dismiss(toastId.id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should update toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      const toastId = result.current.toast({
        title: 'Test',
      });
      toastId.update({
        title: 'Updated',
        id: toastId.id,
      });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });
});

describe('toast reducer', () => {
  it('should add toast', () => {
    const state = { toasts: [] };
    const action = {
      type: 'ADD_TOAST' as const,
      toast: { id: '1', title: 'Test', open: true },
    };

    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe('Test');
  });

  it('should update toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Test', open: true }],
    };
    const action = {
      type: 'UPDATE_TOAST' as const,
      toast: { id: '1', title: 'Updated' },
    };

    const newState = reducer(state, action);

    expect(newState.toasts[0].title).toBe('Updated');
  });

  it('should dismiss toast', () => {
    const state = {
      toasts: [{ id: '1', title: 'Test', open: true }],
    };
    const action = {
      type: 'DISMISS_TOAST' as const,
      toastId: '1',
    };

    const newState = reducer(state, action);

    expect(newState.toasts[0].open).toBe(false);
  });

  it('should remove toast', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Test', open: true },
        { id: '2', title: 'Test 2', open: true },
      ],
    };
    const action = {
      type: 'REMOVE_TOAST' as const,
      toastId: '1',
    };

    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].id).toBe('2');
  });

  it('should remove all toasts when toastId is undefined', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Test', open: true },
        { id: '2', title: 'Test 2', open: true },
      ],
    };
    const action = {
      type: 'REMOVE_TOAST' as const,
      toastId: undefined,
    };

    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(0);
  });

  it('should dismiss all toasts when toastId is undefined', () => {
    const state = {
      toasts: [
        { id: '1', title: 'Test', open: true },
        { id: '2', title: 'Test 2', open: true },
      ],
    };
    const action = {
      type: 'DISMISS_TOAST' as const,
      toastId: undefined,
    };

    vi.useFakeTimers();
    const newState = reducer(state, action);

    expect(newState.toasts[0].open).toBe(false);
    expect(newState.toasts[1].open).toBe(false);
    vi.useRealTimers();
  });

  it('should handle onOpenChange callback', () => {
    const { result } = renderHook(() => useToast());

    let toastId: { id: string; dismiss: () => void; update: (props: any) => void } | undefined;

    act(() => {
      toastId = result.current.toast({
        title: 'Test',
      });
    });

    // Verify toast was created
    expect(result.current.toasts.length).toBeGreaterThan(0);
    const initialToast = result.current.toasts.find(t => t.id === toastId!.id);
    expect(initialToast?.open).toBe(true);
    expect(initialToast?.onOpenChange).toBeDefined();

    // Now call onOpenChange in a separate act to ensure state updates
    act(() => {
      if (initialToast?.onOpenChange) {
        // Call onOpenChange with false, which should trigger dismiss
        initialToast.onOpenChange(false);
      }
    });

    // After onOpenChange(false), dismiss() is called which dispatches DISMISS_TOAST
    // The dispatch updates memoryState and calls listeners synchronously
    // So the state should be updated immediately
    const dismissedToast = result.current.toasts.find(t => t.id === toastId!.id);
    // The toast should have open: false after dismiss is called
    expect(dismissedToast).toBeDefined();
    expect(dismissedToast?.open).toBe(false);
  });

  it('should limit toasts to TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Toast 1' });
      result.current.toast({ title: 'Toast 2' });
      result.current.toast({ title: 'Toast 3' });
    });

    // TOAST_LIMIT is 1, so only the latest should be kept
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast 3');
  });
});

