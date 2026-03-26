import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const DEMO_PROFILE = {
  name: "Marco Demo",
  degree: "MSc Computer Science",
  university: "ETH Zurich",
  skills: ["Python", "machine learning", "NLP", "data analysis", "PyTorch", "transformers"],
  thesis_topic: "Explainable Vulnerability Detection: Using Chain-of-Thought Prompting to Audit LLM Security Analysis in Source Code",
  current_phase: "topic_supervisor",
  deep_interests: ["interpretability", "code security", "LLM reasoning"],
  strengths: ["strong ML foundations", "good at systematic analysis", "fast learner"],
  weaknesses: ["limited industry experience", "tendency to over-scope"],
  thesis_type: "scientific/experimental",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { mode, phase, conversation_history } = await req.json();
    const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };

    const profileContext = `STUDENT PROFILE:
- Name: ${DEMO_PROFILE.name}
- Degree: ${DEMO_PROFILE.degree}
- University: ${DEMO_PROFILE.university}
- Skills: ${DEMO_PROFILE.skills.join(", ")}
- Thesis: ${DEMO_PROFILE.thesis_topic}
- Current Phase: ${DEMO_PROFILE.current_phase}
- Deep interests: ${DEMO_PROFILE.deep_interests.join(", ")}
- Strengths: ${DEMO_PROFILE.strengths.join(", ")}
- Weaknesses: ${DEMO_PROFILE.weaknesses.join(", ")}
- Thesis type: ${DEMO_PROFILE.thesis_type}

NOTE: This student has a scientific/experimental thesis. Adapt all outputs to the thesis type. The system supports ALL thesis types: scientific, argumentative, compilative, project-based, creative, legal, economic, humanities, artistic.`;

    // ─── GENERATE TASKS ───
    if (mode === "generate_tasks") {
      const targetPhase = phase || "topic_supervisor";
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `You are a thesis advisor task generator. Generate 3-5 concrete, actionable tasks for a student in the "${targetPhase}" phase.

${profileContext}

Return JSON array of tasks. Each task has: id (string), title (string, max 60 chars), description (string, 1-2 sentences), priority ("critical"|"high"|"medium"), status ("pending"|"completed"), estimated_minutes (number).
Mark 1-2 tasks as completed for realism. Be specific to this student's thesis topic.`,
          }, { role: "user", content: `Generate tasks for the ${targetPhase} phase.` }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let tasks = [];
      try { tasks = JSON.parse(data.choices[0].message.content).tasks || []; } catch { tasks = []; }
      return new Response(JSON.stringify({ tasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── COMPUTE CAREER DISTRIBUTION ───
    if (mode === "compute_career") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Analyze this student's profile and compute a career distribution across 4-6 real industry sectors. Percentages must sum to 100.

${profileContext}

Return JSON with "sectors" array. Each: { name (string), percentage (number), reasoning (string, 1 sentence) }. Order by percentage descending.`,
          }, { role: "user", content: "Compute career distribution." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let sectors = [];
      try { sectors = JSON.parse(data.choices[0].message.content).sectors || []; } catch { sectors = []; }
      return new Response(JSON.stringify({ sectors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── MATCH SUPERVISORS ───
    if (mode === "match_supervisors") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `You are a supervisor matching engine. Generate 3 realistic supervisor suggestions for this student based on their thesis topic and interests.

${profileContext}

Create realistic but fictional professors at real Swiss/European universities. Each supervisor should have different strengths relevant to the thesis.

Return JSON with "supervisors" array. Each: { id (string), name (string, with title "Prof. Dr."), fields (array of 2-3 research areas), score (number 70-95), reasoning (string, 2-3 sentences explaining the match quality — be specific about how their research connects to the student's thesis), email (string, realistic university email), university (string) }.
Order by score descending. Make the reasoning detailed and specific to the thesis topic.`,
          }, { role: "user", content: "Find matching supervisors." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let supervisors = [];
      try { supervisors = JSON.parse(data.choices[0].message.content).supervisors || []; } catch { supervisors = []; }
      return new Response(JSON.stringify({ supervisors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── EXTRACT VULNERABILITIES ───
    if (mode === "extract_vulnerabilities") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `You are a ruthless thesis critic. Identify 3-4 vulnerabilities in this student's thesis approach. Be direct, aggressive, and specific.

${profileContext}

${conversation_history ? `RECENT CONVERSATION:\n${JSON.stringify(conversation_history.slice(-10))}` : ""}

Categories: "cliche", "logic_gap", "methodology_flaw", "superficiality", "originality_deficit"
Severity: "critical" (thesis-blocking), "high" (serious), "medium" (needs improvement)

Return JSON with "vulnerabilities" array. Each: { id (string), type (string), title (string, max 50 chars), description (string, 1-2 sentences, brutal honesty), severity (string) }.`,
          }, { role: "user", content: "Analyze thesis vulnerabilities." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let vulnerabilities = [];
      try { vulnerabilities = JSON.parse(data.choices[0].message.content).vulnerabilities || []; } catch { vulnerabilities = []; }
      return new Response(JSON.stringify({ vulnerabilities }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GENERATE REFERENCES ───
    if (mode === "generate_references") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Generate 4-5 realistic academic references relevant to this student's thesis. Mix foundational works, methodology papers, recent advances, and critical perspectives.

${profileContext}

Return JSON with "references" array. Each: { title (string), authors (string, "LastName et al." format), year (string), url (string, use "#" as placeholder), category ("foundational"|"methodology"|"recent"|"contrarian"), relevance (string, 1 sentence) }.`,
          }, { role: "user", content: "Generate relevant references." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let references = [];
      try { references = JSON.parse(data.choices[0].message.content).references || []; } catch { references = []; }
      return new Response(JSON.stringify({ references }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GENERATE ROADMAP ───
    if (mode === "generate_roadmap") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Generate a thesis roadmap with 3 phases (Planning, Execution, Writing). Each phase should have 4-5 specific tasks.

${profileContext}

Return JSON with "phases" array. Each: { key (string: "planning"|"execution"|"writing"), title (string), tasks (array of { id (string), title (string), completed (boolean), due_date (string, ISO date format, realistic dates from April to August 2026) }) }.
Mark some planning tasks as completed for realism.`,
          }, { role: "user", content: "Generate thesis roadmap." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let phases = [];
      try { phases = JSON.parse(data.choices[0].message.content).phases || []; } catch { phases = []; }
      return new Response(JSON.stringify({ phases }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── MATCH EXPERTS ───
    if (mode === "match_experts") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Generate 3 realistic industry expert suggestions for this student to potentially interview. Mix researchers and practitioners.

${profileContext}

Return JSON with "experts" array. Each: { id (string), name (string, "Dr." or "Ing." prefix), title (string, "Role @ Company"), score (number 70-90), reasoning (string, 1 sentence), offerInterviews (boolean), email (string) }.`,
          }, { role: "user", content: "Find matching experts." }],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      let experts = [];
      try { experts = JSON.parse(data.choices[0].message.content).experts || []; } catch { experts = []; }
      return new Response(JSON.stringify({ experts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Demo engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
