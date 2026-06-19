// src/hooks/useEntities.ts
// TanStack Query bridge: cached entity reads, optimistic-feeling mutations
// via cache invalidation, and Postgres-changes websockets that invalidate
// the right query keys so the UI stays live without polling.

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entities, demoMode } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ContactStage, PainSignalInput, PilotFeedback } from "@/lib/types";

export const keys = {
  signals: ["build_signals"] as const,
  contacts: ["founder_contacts"] as const,
  feedback: ["pilot_feedback"] as const,
};

/** One websocket channel per table → invalidate that table's query key. */
export function useRealtimeInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) {
      // Demo mode: light heartbeat so simulated pipeline landings appear.
      const t = window.setInterval(() => {
        void qc.invalidateQueries({ queryKey: keys.signals });
      }, 1500);
      return () => window.clearInterval(t);
    }
    const client = supabase;
    const map: Array<[string, readonly string[]]> = [
      ["build_signals", keys.signals],
      ["founder_contacts", keys.contacts],
      ["pilot_feedback", keys.feedback],
    ];
    const channels = map.map(([table, key]) =>
      client
        .channel(`rq:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          void qc.invalidateQueries({ queryKey: key as unknown as string[] });
        })
        .subscribe(),
    );
    return () => channels.forEach((ch) => void client.removeChannel(ch));
  }, [qc]);
}

export const useBuildSignals = () =>
  useQuery({ queryKey: keys.signals, queryFn: entities.buildSignals.list });

export const useContacts = () =>
  useQuery({ queryKey: keys.contacts, queryFn: entities.contacts.list });

export const useFeedback = () =>
  useQuery({ queryKey: keys.feedback, queryFn: entities.feedback.list });

export function useSubmitPainSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PainSignalInput) => entities.painSignals.submitAndScan(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.signals }),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: entities.contacts.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.contacts }),
  });
}

export function useSetContactStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ContactStage }) =>
      entities.contacts.setStage(id, stage),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.contacts }),
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<PilotFeedback, "nps" | "pmf_score" | "verbatim" | "build_signal_id">) =>
      entities.feedback.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.feedback }),
  });
}

export { demoMode };
