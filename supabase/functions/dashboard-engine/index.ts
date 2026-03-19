import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ALL dashboard data in parallel
    const [
      profileRes,
      studentProfileRes,
      tasksRes,
      vulnsRes,
      affinitySupervisorsRes,
      affinityCompaniesRes,
      memoryRes,
      suggestionsRes,
      messagesCountRes,
      eventsRes,
      embeddingsCountRes,
    ] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, thesis_topic, journey_state, degree, university, skills").eq("user_id", userId).single(),
      supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("socrate_tasks").select("id, title, description, section, priority, status, estimated_minutes, created_at").eq("user_id", userId).eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      supabase.from("vulnerabilities").select("id, type, title, description, severity, created_at").eq("user_id", userId).eq("resolved", false).order("created_at", { ascending: false }).limit(8),
      supabase.from("affinity_scores").select("entity_id, entity_name, score, reasoning, matched_traits").eq("user_id", userId).eq("entity_type", "supervisor").order("score", { ascending: false }).limit(6),
      supabase.from("affinity_scores").select("entity_id, entity_name, score, reasoning, matched_traits").eq("user_id", userId).eq("entity_type", "company").order("score", { ascending: false }).limit(6),
      supabase.from("memory_entries").select("id, type, title, detail, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabase.from("socrate_suggestions").select("id, category, title, detail, reason, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
      supabase.from("socrate_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("session_events").select("event_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("embeddings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const profile = profileRes.data;
    const studentProfile = studentProfileRes.data as any;
    const tasks = tasksRes.data || [];
    const vulnerabilities = (vulnsRes.data || []) as any[];
    const supervisors = (affinitySupervisorsRes.data || []) as any[];
    const companies = (affinityCompaniesRes.data || []) as any[];
    const memories = memoryRes.data || [];
    const suggestions = suggestionsRes.data || [];
    const totalMessages = messagesCountRes.count || 0;
    const events = eventsRes.data || [];
    const embeddingsCount = embeddingsCountRes.count || 0;

    // Compute activity by day (last 14 days)
    const activityByDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      activityByDay[d.toISOString().split("T")[0]] = 0;
    }
    events.forEach((e: any) => {
      const day = e.created_at?.split("T")[0];
      if (day && activityByDay[day] !== undefined) activityByDay[day]++;
    });

    // Compute stage
    const stages = ["exploration", "topic_chosen", "structuring", "writing", "revision"];
    const currentStage = studentProfile?.thesis_stage || profile?.journey_state || "exploration";
    const stageIndex = stages.indexOf(currentStage);

    // Health score: composite metric
    const completion = studentProfile?.overall_completion || 0;
    const qualityScore = studentProfile?.thesis_quality_score || 0;
    const unresolvedVulns = vulnerabilities.length;
    const healthScore = Math.max(0, Math.min(100,
      completion * 0.4 + qualityScore * 4 + Math.max(0, 30 - unresolvedVulns * 5)
    ));

    return new Response(JSON.stringify({
      identity: {
        name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
        thesis_topic: profile?.thesis_topic || null,
        degree: profile?.degree || null,
        university: profile?.university || null,
      },
      progress: {
        stage: currentStage,
        stage_index: stageIndex,
        total_stages: stages.length,
        completion,
        quality_score: qualityScore,
        health_score: Math.round(healthScore),
        estimated_days: studentProfile?.estimated_days_remaining || null,
        severita: studentProfile?.severita || 1.0,
      },
      intellect: {
        reasoning_style: studentProfile?.reasoning_style || null,
        strengths: studentProfile?.strengths || [],
        weaknesses: studentProfile?.weaknesses || [],
        deep_interests: studentProfile?.deep_interests || [],
        research_maturity: studentProfile?.research_maturity || null,
        critical_thinking: studentProfile?.critical_thinking || null,
        writing_quality: studentProfile?.writing_quality || null,
      },
      tasks,
      vulnerabilities,
      supervisors,
      companies,
      suggestions: suggestions.slice(0, 10),
      memories: memories.slice(0, 10),
      stats: {
        total_messages: totalMessages,
        total_extractions: studentProfile?.total_extractions || 0,
        total_exchanges: studentProfile?.total_exchanges || 0,
        embeddings_count: embeddingsCount,
        activity_by_day: activityByDay,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dashboard-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
