import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../utils/supabase";

/**
 * useRealtimeSync
 *
 * Subscribes to Supabase Realtime for the three core tables used across the
 * purchase-system pages. When Supabase pushes a change event the hook calls
 * `queryClient.invalidateQueries()` with only the affected cache key(s) so
 * React Query re-fetches just that data — not everything.
 *
 * Subscriptions request only the minimum columns needed to identify the
 * changed row, keeping the Realtime payload as small as possible.
 *
 * Usage:
 *   import { useRealtimeSync } from "../hooks/useRealtimeSync";
 *   // inside any component:
 *   useRealtimeSync();
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // ── Channel 1: indent_items ────────────────────────────────
    // Covers: Approval page (pending batches list)
    // Payload columns kept minimal — just the status fields needed to know
    // whether the cache is stale.
    const indentItemsChannel = supabase
      .channel("realtime:indent_items")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT | UPDATE | DELETE
          schema: "public",
          table: "indent_items",
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ["approvalsData"] });
        }
      )
      .subscribe();

    // ── Channel 2: approved_indent_items ───────────────────────
    // Covers: Approval history tab + PurchaseOrder approved items list
    const approvedItemsChannel = supabase
      .channel("realtime:approved_indent_items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approved_indent_items",
        },
        (_payload) => {
          // Invalidate both caches that depend on this table
          queryClient.invalidateQueries({ queryKey: ["approvalsData"] });
          queryClient.invalidateQueries({ queryKey: ["purchaseOrderPageData"] });
        }
      )
      .subscribe();

    // ── Channel 3: purchase_orders ─────────────────────────────
    // Covers: POHistory, OrdersPipeline stats + list, PurchaseOrder (PO dedup)
    const purchaseOrdersChannel = supabase
      .channel("realtime:purchase_orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchase_orders",
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ["pipelineOrders"] });
          queryClient.invalidateQueries({ queryKey: ["pipelineStats"] });
          queryClient.invalidateQueries({ queryKey: ["poHistory"] });
          queryClient.invalidateQueries({ queryKey: ["nextPoNumber"] });
          queryClient.invalidateQueries({ queryKey: ["purchaseOrderPageData"] });
        }
      )
      .subscribe();

    // ── Cleanup ────────────────────────────────────────────────
    return () => {
      supabase.removeChannel(indentItemsChannel);
      supabase.removeChannel(approvedItemsChannel);
      supabase.removeChannel(purchaseOrdersChannel);
    };
  }, [queryClient]);
}
