import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UsePostViewTrackingOptions {
  postId: number;
  threshold?: number; // Percentage of element that needs to be visible
  delay?: number; // Delay in milliseconds before tracking view
}

export function usePostViewTracking({
  postId,
  threshold = 0.5,
  delay = 1000,
}: UsePostViewTrackingOptions) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const trackViewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${postId}/view`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to track view");
      }

      return response.json();
    },
    onSuccess: () => {
      // Optimistically bump the views cache immediately
      queryClient.setQueryData<{ views: number } | undefined>(
        [`/api/posts/${postId}/views`],
        (prev) => ({ views: (prev?.views ?? 0) + 1 })
      );
      queryClient.setQueryData<any[] | undefined>(["/api/posts"], (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((p) =>
          p?.id === postId
            ? { ...p, viewsCount: Number(p?.viewsCount ?? 0) + 1 }
            : p
        );
      });

      // Refresh the views API so UI updates immediately
      queryClient.invalidateQueries({
        queryKey: [`/api/posts/${postId}/views`],
      });
      // Also update aggregated posts list which includes viewsCount
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      console.error("View tracking error:", error);
    },
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Clear any existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            // Set a delay before tracking the view
            timeoutRef.current = setTimeout(() => {
              if (!hasTracked.current && entry.isIntersecting) {
                hasTracked.current = true;
                trackViewMutation.mutate();
              }
            }, delay);
          } else {
            // Clear timeout if element is no longer visible
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          }
        });
      },
      {
        threshold: threshold,
        rootMargin: "0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [postId, threshold, delay, trackViewMutation]);

  return elementRef;
}
